export const schemaSql = `
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, salary INTEGER, department_id INTEGER REFERENCES departments(id));
CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER REFERENCES departments(id), budget INTEGER NOT NULL);
`;
export function seedDatabase(db, variant = 0) {
  db.exec(schemaSql);
  const department = db.prepare("INSERT INTO departments VALUES (?,?)");
  for (const row of [
    [1, "Engineering"],
    [2, "Analytics"],
    [3, "Operations"],
    [4, "Design"],
  ])
    department.run(...row);
  const employee = db.prepare("INSERT INTO employees VALUES (?,?,?,?,?)");
  let rows = [
    [1, "Asha", "asha@example.test", 85000, 1],
    [2, "Ravi", "ravi@example.test", 62000, 1],
    [3, "Maya", "maya@example.test", 95000, 2],
    [4, "Omar", "omar@example.test", 48000, 3],
    [5, "Nina", "nina@example.test", 72000, 2],
    [6, "Leo", "leo@example.test", 50000, 1],
    [7, "Isha", "isha@example.test", 54000, 1],
    [8, "Noah", "noah@example.test", 42000, 3],
  ];
  if (variant === 1)
    rows = [
      [11, "P", "p@example.test", 50000, 1],
      [12, "Q", "q@example.test", 50001, 2],
      [13, "R", "r@example.test", 50001, 2],
      [14, "S", "s@example.test", null, null],
    ];
  if (variant === 2)
    rows = [
      [21, "U", "u@example.test", 90000, 1],
      [22, "V", "v@example.test", 90000, 1],
      [23, "W", "w@example.test", 20000, 1],
      [24, "X", "x@example.test", null, 1],
      [25, "Y", "y@example.test", 60000, 3],
      [26, "Z", "z@example.test", 70000, 3],
    ];
  if (variant === 3) rows = [];
  if (variant === 4)
    rows = [
      [31, "Same", "s1@example.test", 61000, 2],
      [32, "Same", "s2@example.test", 61000, 2],
      [33, "A", "a@example.test", 49000, 2],
      [34, "B", "b@example.test", 80000, 2],
      [35, "C", "c@example.test", 80000, null],
    ];
  for (const row of rows) employee.run(...row);
  const project = db.prepare("INSERT INTO projects VALUES (?,?,?,?)");
  const projects =
    variant === 3
      ? []
      : [
          [1, "Platform renewal", 1, 150000 + variant * 1000],
          [2, "Forecast lab", 2, 90000],
          [3, "Data quality", 2, 45000],
          [4, "Workflow hub", 3, 30000],
        ];
  for (const row of projects) project.run(...row);
}
