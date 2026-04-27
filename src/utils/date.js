export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

export function formatDateLong(value) {
  if (!value) return "fecha a definir";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function getMonthMatrix(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonthDays = new Date(year, monthIndex, 0).getDate();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstWeekday + 1;
    const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
    const displayDay = isCurrentMonth
      ? dayNumber
      : dayNumber < 1
        ? previousMonthDays + dayNumber
        : dayNumber - daysInMonth;
    const cellDate = new Date(
      year,
      isCurrentMonth ? monthIndex : dayNumber < 1 ? monthIndex - 1 : monthIndex + 1,
      displayDay,
    );

    cells.push({
      date: cellDate,
      iso: toISODate(cellDate),
      day: displayDay,
      isCurrentMonth,
    });
  }

  return cells;
}
