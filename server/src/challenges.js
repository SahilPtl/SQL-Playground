// Private grading contract. Never import this module into client code.
const definitions = [
  [
    "salary-filter",
    "Above the threshold",
    "Easy",
    600,
    "Return id, name, salary for employees earning strictly more than 50000. Order by id.",
    true,
    `SELECT id,name,salary FROM employees WHERE salary > 50000 ORDER BY id`,
    "Start with WHERE and a numeric comparison.",
  ],
  [
    "department-count",
    "Every department counts",
    "Easy",
    600,
    "Return department (the department name) and employee_count for every department, including those with zero employees. Row order does not matter.",
    false,
    `SELECT d.name AS department, COUNT(e.id) AS employee_count FROM departments d LEFT JOIN employees e ON e.department_id=d.id GROUP BY d.id,d.name`,
    "Use LEFT JOIN and count an employee column, not COUNT(*).",
  ],
  [
    "second-salary",
    "Second distinct salary",
    "Medium",
    900,
    "Return one column named second_highest_salary and one row containing the second-highest distinct non-NULL salary. Return NULL if fewer than two distinct salaries exist.",
    false,
    `SELECT MAX(salary) AS second_highest_salary FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)`,
    "Find the maximum below the overall maximum.",
  ],
  [
    "large-teams",
    "Find the larger teams",
    "Medium",
    900,
    "Return department and employee_count for departments with more than three employees. Order by department ascending.",
    true,
    `SELECT d.name AS department, COUNT(e.id) AS employee_count FROM departments d JOIN employees e ON e.department_id=d.id GROUP BY d.id,d.name HAVING COUNT(e.id)>3 ORDER BY department`,
    "Filter groups with HAVING.",
  ],
  [
    "employee-join",
    "Connect the people",
    "Easy",
    600,
    "Return id, name, department for employees assigned to a department. Order by employee id.",
    true,
    `SELECT e.id,e.name,d.name AS department FROM employees e JOIN departments d ON e.department_id=d.id ORDER BY e.id`,
    "Join the department foreign key to the department primary key.",
  ],
  [
    "above-average",
    "Above their team average",
    "Hard",
    1200,
    "Return id, name, salary for employees whose salary exceeds their own department average. Employees without a department are excluded. Order by id.",
    true,
    `SELECT e.id,e.name,e.salary FROM employees e WHERE e.salary > (SELECT AVG(x.salary) FROM employees x WHERE x.department_id=e.department_id) ORDER BY e.id`,
    "A correlated subquery can compute the average for each employee’s department.",
  ],
  [
    "salary-rank",
    "Rank without gaps",
    "Hard",
    1200,
    "Return id, name, salary, salary_rank for employees with a non-NULL salary. Rank distinct salaries descending using dense ranks across all employees. Order by salary_rank, then id.",
    true,
    `SELECT id,name,salary,DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_rank FROM employees WHERE salary IS NOT NULL ORDER BY salary_rank,id`,
    "DENSE_RANK gives ties the same rank without skipping the next rank.",
  ],
  [
    "department-budget",
    "People and project budgets",
    "Hard",
    1200,
    "Return department, employee_count, total_budget for every department, including empty ones. Count employees and sum project budgets without duplicating either. Use zero for missing budgets. Order by department.",
    true,
    `SELECT d.name AS department, (SELECT COUNT(*) FROM employees e WHERE e.department_id=d.id) AS employee_count, COALESCE((SELECT SUM(p.budget) FROM projects p WHERE p.department_id=d.id),0) AS total_budget FROM departments d ORDER BY department`,
    "Aggregate each child table independently before combining totals.",
  ],
];
export const challenges = definitions.map(
  ([
    id,
    title,
    difficulty,
    durationSeconds,
    description,
    ordered,
    solution,
    hint,
  ]) => ({
    id,
    title,
    difficulty,
    durationSeconds,
    description,
    ordered,
    solution,
    hint,
    baseScore: 100,
  }),
);
export const publicChallenge = ({ solution, hint, ...rest }) => rest;
export function compareResults(actual, expected, ordered) {
  if (
    JSON.stringify(actual.columns) !== JSON.stringify(expected.columns) ||
    actual.truncated
  )
    return false;
  const normalize = (rows) => rows.map((row) => JSON.stringify(row));
  const a = normalize(actual.rows),
    b = normalize(expected.rows);
  if (!ordered) {
    a.sort();
    b.sort();
  }
  return JSON.stringify(a) === JSON.stringify(b);
}
