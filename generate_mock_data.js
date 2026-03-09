import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'public', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Generate Employee Data
const numEmployees = 15;
const roles = ['Barista', 'Shift Lead', 'Roaster', 'Manager'];
let employeeCsv = 'employee_id,role,hourly_rate,hours_per_week\n';
for (let i = 1; i <= numEmployees; i++) {
  const role = roles[Math.floor(Math.random() * roles.length)];
  let rate;
  if (role === 'Barista') rate = (Math.random() * 5 + 15).toFixed(2); // 15-20
  else if (role === 'Shift Lead') rate = (Math.random() * 4 + 20).toFixed(2); // 20-24
  else if (role === 'Roaster') rate = (Math.random() * 5 + 23).toFixed(2); // 23-28
  else rate = (Math.random() * 10 + 25).toFixed(2); // 25-35
  
  const hours = Math.floor(Math.random() * 20 + 20); // 20-40 hours
  employeeCsv += `E${i.toString().padStart(3, '0')},${role},${rate},${hours}\n`;
}

fs.writeFileSync(path.join(dataDir, 'employee_data.csv'), employeeCsv);
console.log('Created public/data/employee_data.csv');

// Generate Customer Transactions
const numTransactions = 5000;
let transactionCsv = 'transaction_id,timestamp,product_category,price,quantity,discount_applied\n';

const categories = ['Espresso', 'Pour Over', 'Cold Brew', 'Pastry', 'Merch'];
const basePrices = {
    'Espresso': 3.50,
    'Pour Over': 5.00,
    'Cold Brew': 4.50,
    'Pastry': 4.00,
    'Merch': 25.00
};

// Simulate 3 months of data
const startDate = new Date();
startDate.setMonth(startDate.getMonth() - 3);

for (let i = 1; i <= numTransactions; i++) {
    const date = new Date(startDate.getTime() + Math.random() * (new Date().getTime() - startDate.getTime()));
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    // Simulate some price variance/elasticity experiments in the past
    const variance = (Math.random() * 1.5) - 0.5; // -$0.50 to +$1.00
    const price = Math.max(1.00, basePrices[category] + variance).toFixed(2);
    
    // Lower demand at higher prices generally
    let quantity;
    if (variance > 0.5) quantity = Math.floor(Math.random() * 2) + 1; // 1-2
    else if (variance < 0) quantity = Math.floor(Math.random() * 3) + 2; // 2-4
    else quantity = Math.floor(Math.random() * 2) + 1; // 1-2

    const discount = Math.random() > 0.8 ? 'TRUE' : 'FALSE';
    
    transactionCsv += `T${i.toString().padStart(5, '0')},${date.toISOString()},${category},${price},${quantity},${discount}\n`;
}

fs.writeFileSync(path.join(dataDir, 'customer_transactions.csv'), transactionCsv);
console.log('Created public/data/customer_transactions.csv');
