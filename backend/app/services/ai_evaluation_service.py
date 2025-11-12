# services/ai_evaluation_service.py

import os
import json
import re
import logging
from typing import Dict, List, Any, Optional
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, BitsAndBytesConfig
import torch
import asyncio
from datetime import datetime
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIEvaluationService:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.pipeline = None
        self.model_loaded = False
        self._load_model()
    
    def _load_model(self):
        """Load the Mistral model for evaluation"""
        try:
            logger.info("🚀 Loading Mistral 7B model for AI evaluation...")
            
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
            )
            
            model_name = "mistralai/Mistral-7B-Instruct-v0.1"
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                quantization_config=quantization_config,
                device_map="auto",
                trust_remote_code=True,
                torch_dtype=torch.float16
            )
            
            self.pipeline = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                max_new_tokens=1024,
                temperature=0.1,
                do_sample=False,
                return_full_text=False
            )
            
            self.model_loaded = True
            logger.info("✅ Mistral 7B model loaded successfully!")
            
        except Exception as e:
            logger.error(f"❌ Failed to load Mistral model: {e}")
            self.model_loaded = False
    
    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\x20-\x7E\n\r\t]', '', text)
        return text.strip()
    
    def _extract_json_strict(self, text: str) -> Optional[str]:
        """Very strict JSON extraction from LLM response"""
        try:
            # Remove any text before first { and after last }
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                json_str = text[start_idx:end_idx+1]
                
                # Multiple cleanup attempts
                for attempt in range(3):
                    try:
                        # Try to parse directly
                        parsed = json.loads(json_str)
                        return json.dumps(parsed)  # Re-serialize to ensure validity
                    except json.JSONDecodeError as e:
                        # Try to fix common issues
                        if attempt == 0:
                            # Remove trailing commas
                            json_str = re.sub(r',\s*}', '}', json_str)
                            json_str = re.sub(r',\s*]', ']', json_str)
                        elif attempt == 1:
                            # Escape problematic characters
                            json_str = json_str.replace('\n', ' ').replace('\r', ' ')
                            json_str = re.sub(r'\\[^"\\/bfnrtu]', '', json_str)
                        elif attempt == 2:
                            # Try to extract just the core structure
                            match = re.search(r'\{[^{}]*"[^"]*"[^{}]*\}', json_str)
                            if match:
                                json_str = match.group()
                
            return None
        except Exception as e:
            logger.error(f"JSON extraction error: {e}")
            return None
    
    def _generate_evaluation_prompt(self, tender_text: str, vendor_text: str, criteria: List[Dict]) -> str:
        """Generate dynamic prompt based on criteria from database"""
        
        # Create criteria mapping for JSON structure
        criteria_keys = []
        criteria_descriptions = []
        
        for criterion in criteria:
            # Create safe key name (lowercase, underscores)
            key_name = criterion['name'].lower().replace(' ', '_').replace('&', 'and').replace('-', '_')
            key_name = re.sub(r'[^a-z0-9_]', '', key_name)
            criteria_keys.append(key_name)
            criteria_descriptions.append(f"{criterion['name']}: {criterion.get('description', 'No description')}")
        
        # Build JSON template dynamically
        json_template = "{\n"
        for key in criteria_keys:
            json_template += f'  "{key}": {{"score": 85, "reasoning": "brief specific reason"}},\n'
        json_template = json_template.rstrip(',\n') + "\n}"
        
        prompt = f"""ANALYZE THE FOLLOWING TENDER AND VENDOR DOCUMENTS, THEN OUTPUT ONLY RAW JSON.

TENDER DOCUMENT CONTENT:
{tender_text[:3500]}

VENDOR DOCUMENT CONTENT:  
{vendor_text[:4500]}

EVALUATION CRITERIA:
{chr(10).join(criteria_descriptions)}

YOUR TASK: Evaluate the vendor against the tender requirements and output ONLY a JSON object with scores (0-100) and brief reasoning for EACH criterion.

CRITICAL INSTRUCTIONS:
1. OUTPUT MUST BE ONLY VALID JSON - no other text, no explanations, no prefixes
2. Use this EXACT structure:
{json_template}

3. Base scores on evidence found in vendor documents
4. If information is missing for a criterion, score lower and state what's missing
5. DO NOT ADD ANY TEXT BEFORE OR AFTER THE JSON

OUTPUT ONLY THE JSON:"""
        
        return prompt
    
    def _manual_content_evaluation(self, vendor_text: str, criteria: List[Dict]) -> Dict[str, Any]:
        """Manual evaluation fallback based on content analysis"""
        logger.info("📊 Using manual content-based evaluation fallback...")
        
        scores = {}
        
        for criterion in criteria:
            key_name = criterion['name'].lower().replace(' ', '_').replace('&', 'and').replace('-', '_')
            key_name = re.sub(r'[^a-z0-9_]', '', key_name)
            
            # Simple content analysis based on criterion name
            search_terms = [
                criterion['name'].lower(),
                *criterion['name'].lower().split(),
                *criterion.get('description', '').lower().split()[:5]
            ]
            
            # Count occurrences of relevant terms
            term_count = 0
            for term in search_terms:
                if len(term) > 3:  # Only count meaningful terms
                    term_count += len(re.findall(re.escape(term), vendor_text.lower()))
            
            # Score based on term frequency
            if term_count > 15:
                score = 75
                reasoning = f"Strong evidence found ({term_count} relevant mentions)"
            elif term_count > 8:
                score = 60
                reasoning = f"Moderate evidence ({term_count} relevant mentions)"
            elif term_count > 3:
                score = 45
                reasoning = f"Limited evidence ({term_count} relevant mentions)"
            else:
                score = 30
                reasoning = f"Minimal information found ({term_count} relevant mentions)"
            
            scores[key_name] = {
                "score": score,
                "reasoning": reasoning
            }
        
        return scores
    
    def _validate_scores(self, scores_data: Dict, criteria: List[Dict]) -> Dict[str, Any]:
        """Validate and normalize scores from LLM response"""
        validated = {}
        
        for criterion in criteria:
            key_name = criterion['name'].lower().replace(' ', '_').replace('&', 'and').replace('-', '_')
            key_name = re.sub(r'[^a-z0-9_]', '', key_name)
            
            if key_name in scores_data:
                if isinstance(scores_data[key_name], dict):
                    score_info = scores_data[key_name]
                    score = score_info.get('score', 50)
                    reasoning = score_info.get('reasoning', 'No reasoning provided')
                else:
                    score = scores_data[key_name]
                    reasoning = 'Score provided'
            else:
                score = 50
                reasoning = 'Criteria not evaluated by AI'
            
            validated[key_name] = {
                'score': max(0, min(100, int(score))),
                'reasoning': reasoning[:500],
                'criterion_id': criterion['id'],
                'criterion_name': criterion['name']
            }
        
        return validated
    
    def _calculate_weighted_score(self, scores: Dict[str, Any], criteria: List[Dict]) -> float:
        """Calculate weighted final score based on criteria weights"""
        total_weight = sum(criterion.get('weightage', 0) for criterion in criteria)
        if total_weight == 0:
            return 50.0  # Default score if no weights
        
        weighted_total = 0.0
        
        for criterion in criteria:
            key_name = criterion['name'].lower().replace(' ', '_').replace('&', 'and').replace('-', '_')
            key_name = re.sub(r'[^a-z0-9_]', '', key_name)
            
            score_data = scores.get(key_name, {"score": 50})
            score = score_data['score'] if isinstance(score_data, dict) else score_data
            weight = criterion.get('weightage', 0) / total_weight
            weighted_total += score * weight
        
        return round(weighted_total, 2)
    
    def _get_rating(self, score: float) -> str:
        """Get qualitative rating based on score"""
        if score >= 90: return "EXCELLENT"
        elif score >= 80: return "VERY GOOD"
        elif score >= 70: return "GOOD"
        elif score >= 60: return "FAIR"
        else: return "POOR"
    
    async def evaluate_vendor(
        self, 
        tender_text: str, 
        vendor_text: str, 
        criteria: List[Dict],
        vendor_id: str,
        vendor_name: str
    ) -> Dict[str, Any]:
        """
        Main evaluation function for a single vendor
        
        Args:
            tender_text: Text content from tender documents
            vendor_text: Combined OCR text from vendor documents
            criteria: List of criteria from database with id, name, weightage, etc.
            vendor_id: Unique identifier for the vendor
            vendor_name: Name of the vendor
        
        Returns:
            Evaluation results dictionary
        """
        logger.info(f"🎯 Starting AI evaluation for vendor: {vendor_name}")
        
        try:
            # Clean and prepare texts
            clean_tender_text = self._clean_text(tender_text)
            clean_vendor_text = self._clean_text(vendor_text)
            
            if not clean_tender_text or not clean_vendor_text:
                raise ValueError("Tender or vendor text is empty after cleaning")
            
            # LLM Evaluation
            criteria_scores = await self._evaluate_with_llm(clean_tender_text, clean_vendor_text, criteria)
            
            # Calculate final score
            final_score = self._calculate_weighted_score(criteria_scores, criteria)
            rating = self._get_rating(final_score)
            
            # Prepare detailed results
            detailed_scores = {}
            for criterion in criteria:
                key_name = criterion['name'].lower().replace(' ', '_').replace('&', 'and').replace('-', '_')
                key_name = re.sub(r'[^a-z0-9_]', '', key_name)
                
                score_data = criteria_scores.get(key_name, {"score": 50, "reasoning": "Not assessed"})
                
                detailed_scores[criterion['name']] = {
                    "score": score_data['score'],
                    "weightage": criterion.get('weightage', 0),
                    "category": criterion.get('category', 'General'),
                    "reasoning": score_data.get('reasoning', 'No reasoning provided'),
                    "criterion_id": criterion['id']
                }
            
            # Prepare final results
            results = {
                "vendor_id": vendor_id,
                "vendor_name": vendor_name,
                "overall_score": final_score,
                "qualification_status": "Qualified" if final_score >= 60 else "Disqualified",
                "rating": rating,
                "criteria_scores": detailed_scores,
                "evaluation_date": datetime.utcnow().isoformat(),
                "ai_model_used": "Mistral-7B-Instruct-v0.1",
                "documents_analyzed": clean_vendor_text.count("--- Document:") or 1,
                "tender_chars_analyzed": len(clean_tender_text),
                "vendor_chars_analyzed": len(clean_vendor_text)
            }
            
            logger.info(f"✅ AI evaluation completed for {vendor_name}: {final_score}%")
            return results
            
        except Exception as e:
            logger.error(f"❌ AI evaluation failed for vendor {vendor_name}: {e}")
            return self._get_fallback_results(vendor_id, vendor_name, criteria, str(e))
    
    async def _evaluate_with_llm(self, tender_text: str, vendor_text: str, criteria: List[Dict]) -> Dict[str, Any]:
        """Use LLM to evaluate vendor against tender requirements with dynamic criteria"""
        if not self.model_loaded:
            logger.warning("🤖 LLM not loaded, using manual evaluation")
            return self._manual_content_evaluation(vendor_text, criteria)
        
        try:
            prompt = self._generate_evaluation_prompt(tender_text, vendor_text, criteria)
            
            # Run LLM inference
            response = self.pipeline(
                prompt,
                max_new_tokens=512,
                temperature=0.1,
                do_sample=False,
                num_return_sequences=1,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id,
                return_full_text=False
            )
            
            result_text = response[0]['generated_text'].strip()
            logger.debug(f"🤖 LLM Raw Response: {result_text}")
            
            # Extract JSON from response
            json_match = self._extract_json_strict(result_text)
            if json_match:
                scores = json.loads(json_match)
                return self._validate_scores(scores, criteria)
            else:
                logger.warning("❌ Could not extract valid JSON from LLM, using fallback")
                return self._manual_content_evaluation(vendor_text, criteria)
                
        except Exception as e:
            logger.error(f"❌ LLM evaluation failed: {e}")
            return self._manual_content_evaluation(vendor_text, criteria)
    
    def _get_fallback_results(self, vendor_id: str, vendor_name: str, criteria: List[Dict], error_msg: str) -> Dict[str, Any]:
        """Return fallback results when evaluation fails"""
        detailed_scores = {}
        for criterion in criteria:
            detailed_scores[criterion['name']] = {
                "score": 50,
                "weightage": criterion.get('weightage', 0),
                "category": criterion.get('category', 'General'),
                "reasoning": f"Evaluation failed: {error_msg}",
                "criterion_id": criterion['id']
            }
        
        return {
            "vendor_id": vendor_id,
            "vendor_name": vendor_name,
            "overall_score": 50.0,
            "qualification_status": "Cannot Evaluate",
            "rating": "FAIR",
            "criteria_scores": detailed_scores,
            "evaluation_date": datetime.utcnow().isoformat(),
            "ai_model_used": "Fallback",
            "documents_analyzed": 0,
            "tender_chars_analyzed": 0,
            "vendor_chars_analyzed": 0,
            "error": error_msg
        }

# Global service instance
ai_evaluation_service = AIEvaluationService()

async def run_batch_evaluation(
    tender_data: Dict[str, Any],
    vendors_data: List[Dict[str, Any]],
    criteria: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Run AI evaluation for multiple vendors in batch
    
    Args:
        tender_data: {id, title, text_content}
        vendors_data: List of {id, name, documents: [{ocr_text, ...}]}
        criteria: List of criteria from database
    
    Returns:
        Batch evaluation results
    """
    evaluation_id = str(uuid.uuid4())
    logger.info(f"🎯 Starting batch evaluation {evaluation_id} for {len(vendors_data)} vendors")
    
    try:
        # Combine OCR text for each vendor
        vendor_evaluation_tasks = []
        
        for vendor in vendors_data:
            # Combine all OCR text from vendor documents
            combined_vendor_text = ""
            for doc in vendor.get('documents', []):
                if doc.get('ocr_text'):
                    doc_name = doc.get('name', 'Unknown')
                    combined_vendor_text += f"\n\n--- Document: {doc_name} ---\n\n{doc['ocr_text']}"
            
            if not combined_vendor_text:
                logger.warning(f"⚠️ No OCR text found for vendor {vendor['name']}")
                combined_vendor_text = "No document content available for evaluation."
            
            # Create evaluation task
            task = ai_evaluation_service.evaluate_vendor(
                tender_text=tender_data.get('text_content', ''),
                vendor_text=combined_vendor_text,
                criteria=criteria,
                vendor_id=vendor['id'],
                vendor_name=vendor['name']
            )
            vendor_evaluation_tasks.append(task)
        
        # Run all evaluations concurrently
        results = await asyncio.gather(*vendor_evaluation_tasks, return_exceptions=True)
        
        # Process results
        successful_results = []
        failed_vendors = []
        
        for i, result in enumerate(results):
            vendor_name = vendors_data[i]['name']
            if isinstance(result, Exception):
                logger.error(f"❌ Evaluation failed for {vendor_name}: {result}")
                failed_vendors.append({
                    "vendor_id": vendors_data[i]['id'],
                    "vendor_name": vendor_name,
                    "error": str(result)
                })
            else:
                successful_results.append(result)
        
        # Prepare final response
        response = {
            "evaluation_id": evaluation_id,
            "tender_id": tender_data.get('id'),
            "tender_title": tender_data.get('title'),
            "status": "completed",
            "total_vendors": len(vendors_data),
            "successful_evaluations": len(successful_results),
            "failed_evaluations": len(failed_vendors),
            "results": successful_results,
            "failed_vendors": failed_vendors,
            "evaluation_date": datetime.utcnow().isoformat(),
            "criteria_used": [{"id": c['id'], "name": c['name']} for c in criteria]
        }
        
        logger.info(f"✅ Batch evaluation {evaluation_id} completed: {len(successful_results)} successful, {len(failed_vendors)} failed")
        return response
        
    except Exception as e:
        logger.error(f"❌ Batch evaluation {evaluation_id} failed: {e}")
        return {
            "evaluation_id": evaluation_id,
            "status": "failed",
            "error": str(e),
            "results": [],
            "failed_vendors": [],
            "evaluation_date": datetime.utcnow().isoformat()
        }