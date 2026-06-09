# Module: Writing Goals

## Goal definition

The author can define goals in two contexts:
- **Global** (`/write`): applies to all their writing activity
- **Per book** (`/write/[bookId]/goals`): applies specifically to that book

### Goal types
- `DAILY`: X words per day
- `WEEKLY`: X words per week
- `MONTHLY`: X words per month
- `DEADLINE`: I want to write X words in total before [date]

The author can have multiple active goals simultaneously.

### Deadline goal
When setting a DEADLINE goal, the app automatically calculates and displays:
- Words already written in the book
- Words remaining to reach the goal
- Days remaining until the deadline
- Words needed per day to reach it
- Words needed per week
- Words needed per month

## Writing streak

- A day "counts" if the author has written >= their daily goal (if one is active)
- If no daily goal is set, a day counts if at least 1 word was written
- The streak is displayed prominently on the author's dashboard as "🔥 X days in a row"
- If a day passes without writing (or without reaching the daily goal), the streak resets to 0
- The historical record of the longest streak is stored
- Streak timezone is based on the server (UTC); document this for users

## Word count logging

- When the editor saves, the word delta is calculated (new words − deleted words)
- Logged in `WordCountLog` with the current date
- If a log entry already exists for that userId+chapterId+date, the delta is accumulated

## Charts dashboard (`/write/[bookId]/goals`)

### Chart 1: Words written per day (bar chart)
- X axis: last 30 days
- Y axis: words written that day
- Bar highlighted if the daily goal was reached
- Implemented with Recharts `BarChart`

### Chart 2: Progress toward DEADLINE goal (line chart)
- Only visible if an active DEADLINE goal exists
- X axis: dates from start to deadline
- Two lines: "Ideal progress" (straight line from 0 to goal) vs "Actual progress" (daily cumulative)
- Implemented with Recharts `LineChart`

### Quick summary (cards)
- Total words in the book
- Words this week vs weekly goal (if set)
- Words this month vs monthly goal (if set)
- Current streak and historical record