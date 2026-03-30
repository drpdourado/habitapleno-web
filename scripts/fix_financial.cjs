const fs = require('fs');
const path = require('path');
const file = 'c:\\Desenvolvimento\\habitapleno-web\\src\\pages\\FinancialPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Section 1: Mobile Revenue
content = content.replace(/<HabitaIconActionButton icon={<Pencil \/>} variant="primary" size="sm"\s+<HabitaIconActionButton/g, '<HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(revenue, "revenue")} />\n                                                                         <HabitaIconActionButton');
// Fix double closing tags
content = content.replace(/\/>\s+\/>/g, '/>');

// Section 2: Desktop Revenue (similar pattern)
content = content.replace(/<HabitaIconActionButton icon={<Pencil \/>} variant="primary"\s+<HabitaIconActionButton/g, '<HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(revenue, "revenue")} />\n                                                                 <HabitaIconActionButton');
// Fix broken truncation
content = content.replace(/uir Lançamento"\s+\/>/g, '');

// Section 3: Mobile Expense
content = content.replace(/<HabitaIconActionButton icon={<Pencil \/>} vari\s+<HabitaIconActionButton/g, '<HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(expense, "expense")} />\n                                                                         <HabitaIconActionButton');

// Section 4: Desktop Expense
content = content.replace(/<HabitaIconActionButton icon={<Penci\s+<HabitaIconActionButton/g, '<HabitaIconActionButton icon={<Pencil />} variant="primary" size="sm" tooltip="Editar" onClick={() => startEditing(expense, "expense")} />\n                                                                 <HabitaIconActionButton');
// Fix broken tooltip
content = content.replace(/tooltip="Excluir Lançamento"\s+\/>\s+tooltip="Excluir Lançamento"/g, 'tooltip="Excluir Lançamento"');

fs.writeFileSync(file, content);
console.log('Fixed');
