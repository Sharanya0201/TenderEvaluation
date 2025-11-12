// exceltojs.cjs
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = '/home/user/Documents/tenderform.xlsx';
const OUTPUT_PATH = '/home/user/Documents/tenderFormConfig.json';

const convertExcelToJson = () => {
  try {
    // Read workbook and first sheet
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to row-wise JSON
    const rowWiseData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rowWiseData.length < 4) {
      throw new Error('Excel must have at least 4 rows: group, name, type, inputType');
    }

    const numFields = rowWiseData[0].length;
    const fields = [];

    for (let col = 0; col < numFields; col++) {
      fields.push({
        group: rowWiseData[0][col] || null,
        name: rowWiseData[1][col] || null,
        type: rowWiseData[2][col] || null,
        inputType: rowWiseData[3][col] || null,
        options: rowWiseData[3][col] === 'combobox' ? [] : null // fill later if needed
      });
    }

    // Write JSON file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(fields, null, 2));
    console.log(`✅ JSON saved to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('❌ Error converting Excel to JSON:', err.message);
  }
};

convertExcelToJson();
