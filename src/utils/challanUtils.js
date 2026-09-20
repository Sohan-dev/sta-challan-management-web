/**
 * Challan Number Utilities
 * Handles counter management and challan number generation
 */

export function getChallanCounter(type) {
  let now = new Date();
  let yy = String(now.getFullYear()).slice(-2);
  let mm = String(now.getMonth() + 1).padStart(2, '0');
  let dd = String(now.getDate()).padStart(2, '0');
  let key = `challan_${mm}${dd}${yy}`;
  let count = localStorage.getItem(key);
  if (!count) count = 1;
  else count = parseInt(count);
  return { key, count };
}

export function incrementChallanCounter(type) {
  let now = new Date();
  let yy = String(now.getFullYear()).slice(-2);
  let mm = String(now.getMonth() + 1).padStart(2, '0');
  let dd = String(now.getDate()).padStart(2, '0');
  let key = `challan_${mm}${dd}${yy}`;
  let count = localStorage.getItem(key);
  if (!count) count = 1;
  else count = parseInt(count) + 1;
  localStorage.setItem(key, count);
}

export function generateChallanNumber(type) {
  // Format: STAI/MMDDYY/Serial/TypeCode
  let now = new Date();
  let yy = String(now.getFullYear()).slice(-2);
  let mm = String(now.getMonth() + 1).padStart(2, '0');
  let dd = String(now.getDate()).padStart(2, '0');
  let typeCode = type === 'Returnable' ? 'RR' : 'NR';
  
  // Get current serial without incrementing
  let { count: serial } = getChallanCounter(type);
  let serialStr = String(serial).padStart(2, '0');
  let challanNo = `STAI/${mm}${dd}${yy}/${serialStr}/${typeCode}`;
  
  return challanNo;
}
