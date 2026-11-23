# Penny Pal guide

Penny Pal is a free budget app built for Ontario. It does what apps like Rocket Money do (spending, budgets, subscriptions, goals, net worth) plus Canadian tax, RRSP/TFSA/FHSA and Toronto home buying tools. Nothing to pay for, nothing to install, no account.

## Opening it

Keep all the files together in one folder:

```
pocket-ledger/
  index.html    <- double click this to open the app
  config.js     <- numbers, categories, lessons, quests (edit this most)
  styles.css    <- colours and layout
  app.js        <- the engine (you rarely need to touch it)
  icons.js      <- the icon set
  GUIDE.md      <- this file
  tools/        <- helper for adding more icons
```

Double click `index.html`. It opens in your browser and works offline. Fonts need internet the first time, otherwise it falls back to a normal font.

## First 10 minutes

1. **New here?** The app greets you with a 10-step setup (about 3 minutes). Skip anything you like. Already looking at example data? Press **Set up my profile**.
2. **Taxes:** type your salary and the tax taken off each paycheque. You'll see your refund estimate right away.
3. **Budgets:** set a number for each category. The 50/30/20 check tells you if the plan fits your take-home pay.
4. **Transactions:** press **Import from bank** and pick a CSV or PDF statement from RBC, TD, Scotiabank, BMO, CIBC, Tangerine or most others, or a screenshot of your transactions from your banking app. You tick or untick each one before it's saved. Penny then spots charges that repeat every month, offers to add them to Bills, and marks bills as paid when they show up. Or press **+ Add** for each one.
   **Got a receipt?** Press **Scan a receipt**. Take a photo, choose a photo or PDF bill, or paste the text of an emailed receipt (Uber Eats, Rogers, Amazon...). Penny fills in the total, date and store, guesses the category and says why. Nothing is saved until you press Save, so you can fix anything first. Tick "This is a monthly bill" to add it to Bills too.
5. **Bills & subs:** add Netflix, your phone, the gym. The app also spots repeating charges in your transactions.
6. **Goals:** make one for a trip, a first home, an emergency fund. Tap the camera on the card to add your own photo.
7. **Net worth:** add your accounts and debts once a month.

Every step gives XP. Quests on the Rewards page walk you through the rest.

## What each page does

| Page | What it's for |
|---|---|
| Home | Left to spend this month, where money went, bills coming up, fun facts and tips for you |
| Piggy Quests | A 10-step checklist from "see where money goes" to "invest the simple way", plus the 1-minute money check-in |
| Transactions | Every purchase and paycheque. Scan receipts, import bank files, search, recategorize |
| Budgets | A monthly limit per category, plus the 50/30/20 check |
| Bills & subs | Repeating charges, yearly cost, cancel guide, a script to lower your phone bill |
| Goals | Savings pots with photos, monthly amount needed, milestone rewards |
| Net worth | What you own minus what you owe, over time. Credit score tracker |
| Taxes | Federal + Ontario tax, refund estimate, what your RRSP/FHSA saves you |
| Retirement | "If I put $X in my RRSP now, what will I have at 65?" RRSP vs TFSA |
| Buy a home | Cash needed in Toronto: down payment, land transfer taxes, rebates, insurance |
| Learn | 12 short lessons with quizzes, written for beginners |
| Rewards | Level, XP, streak, weekly quests (new ones every Monday), starter quests and badges. Tap any quest to jump to it |
| Reminders | Bills, Canadian tax dates and your own reminders |
| My data | Backup, restore, export, theme, start over |

## Keep your data safe

Your data is saved inside your browser on this computer. That means:

- It never leaves your device. Nobody else can see it.
- If you clear your browser history or "site data", it's gone.
- Your phone and your laptop each have their own separate copy.

**Once a month:** My data, then **Download backup**. To move to another computer or browser, open the app there, go to My data and pick the backup file under **Restore a backup**.

## Changing things yourself

Open the files in a text editor. [VS Code](https://code.visualstudio.com) is free. Save, then refresh the browser tab. Your data is not touched.

### config.js (the one you'll edit most)

Use Ctrl+F (Cmd+F on Mac) to jump to a section:

| Search for | What you can change |
|---|---|
| `1. BASICS` | App name, city |
| `pageNames` | The cute page names (Oink Log, Hog Goals...), the plain name under each, and the funny subtitles |
| `mascotImages` | Penny's 3D pictures for each pose. Add a picture to the `img` folder and list it here |
| `0. FIRST-TIME SETUP` | The 10 setup questions for new profiles, the cheers between steps, typical subscription prices, and the mascot's name |
| `2. TAX NUMBERS` | Federal and Ontario brackets, CPP, EI |
| `3. ACCOUNT LIMITS` | RRSP, TFSA, FHSA limits |
| `4. HOME BUYING` | Land transfer tax brackets, rebates, closing costs |
| `5. RETIREMENT` | Growth presets, CPP and OAS amounts |
| `6. CATEGORIES` | Starting categories (you can also edit them in the app) |
| `GOALS + ACCOUNTS` | Goal types, cover colours, account types |
| `7. AUTO RULES` | Words in a bank description and which category they go to |
| `MERCHANT GUIDE` | Hundreds of Canadian stores and the category each belongs to. Add any store you like |
| `8. LEVELS` | Level names and XP needed |
| `9. QUESTS` | Starter quests (one time) and where tapping each one takes you |
| `9b. WEEKLY QUESTS` | The pool of weekly quests, how many you get, the bonus XP, swaps per week |
| `10. BADGES` | Achievements |
| `10b. MONEY PATH` | The step-by-step checklist: steps, to-dos, "why" notes and words to know |
| `10c. CHEERS` | The celebration pop-ups. Add your own messages and emojis |
| `10d. MONEY CHECK-IN` | The yes/no questions, encouraging replies, stats (with sources) and fun facts |
| `11. LESSONS` | The Learn page: text and quiz |
| `12. CALENDAR` | Built-in yearly reminders |
| `13. CANCEL + NEGOTIATE` | The cancel steps and phone bill script |

**Examples**

Add an auto-sort rule so every Uber Eats order lands in "Eating out":
```js
["UBER EATS", "dining"],
```

Add a lesson: copy one whole `{ id: ..., quiz: {...} }` block in `lessons`, paste it right after, and give it a new `id`.

Add a quest that's done when you have 3 goals:
```js
{ id: "threeGoals", icon: "target", title: "Have 3 savings goals", how: "Goals page", xp: 60, check: (s) => s.goals.length >= 3 },
```

Add a weekly quest (it joins the pool and starts showing up on random Mondays):
```js
{ id: "w_coffee", icon: "coffee", title: "Log every coffee this week", xp: 30, go: { act: "addTx" },
  progress: (s, W) => [s.transactions.filter((t) => t.cat === "coffee" && W.has(t.added)).length, 3] },
```
`progress` returns two numbers: how far you are and the goal. When the first reaches the second, the quest is done. `go` is where tapping it takes you: `page` opens a page, `act` presses a button there for you, `focus` highlights a box.

Rules for not breaking it: keep the commas between items, keep quotes around text, and keep brackets matched. If you need an apostrophe inside text, the text is already in double quotes so it's fine.

### styles.css

The first block at the top is the light mode colours. The two blocks after it are dark mode. Change `--accent` to change the main colour everywhere.

### Adding icons

All 120 included icons show up in the category icon picker. To add more from [lucide.dev](https://lucide.dev): open `icons.js`, copy any line, change the name, and paste the inside of the icon's SVG (everything between `<svg ...>` and `</svg>`).

### If something breaks

Press F12 (Cmd+Option+I on Mac), click **Console**. The red message says which file and line. It's almost always a missing comma or quote right where you just edited. Keep a copy of the folder before big changes so you can go back.

## When you add categories or rules to config.js

New categories and auto-sort rules you add to `config.js` reach everyone, including people who already use the app. The next time they open it, they're added and a small "App updated" message appears. The app remembers what each person already got, so:

- If someone deleted or renamed a category, it stays the way they left it.
- If someone deleted a rule, it doesn't come back.
- If someone already has a rule for the same words, theirs wins.

To change an existing rule for everyone, add it with the new category instead of editing the old line. Changing an old line only affects new users.

## Sharing updates with friends

When you change the app and republish it to the same link, everyone with the link gets the new version and keeps everything they've entered. To show them what changed, bump `version` at the top of `config.js` and replace the lines in `whatsNew` with just the newest changes (one to three lines is plenty). They'll see a "What's new" popup once.

Keep the stats in `10d` honest: each one lists its source and year. When newer surveys come out, update the numbers and the year.

## Every fall: update the numbers

The CRA and Ontario announce next year's numbers around November. Search these, copy the numbers into `config.js`, and change `year`:

- "CRA tax brackets 2027" (federal brackets, basic personal amount, Canada employment amount)
- "Ontario tax brackets 2027" (Ontario brackets, basic personal amount, surtax thresholds)
- "CPP contribution rates 2027" and "EI premium rate 2027"
- "RRSP limit 2027" and "TFSA limit 2027"

That's the only regular upkeep.

## Want it on your phone?

The simplest free way: put the folder online with **Netlify Drop** (app.netlify.com/drop) or **GitHub Pages**, then open the link on your phone and choose "Add to Home Screen". Each device keeps its own data, so use backup and restore to move it between them.

## How receipt scanning works

- **Emails, saved .eml/.txt/.html files and PDF bills:** read right on your device. PDFs need internet the first time to load the PDF reader.
- **Photos and scanned PDFs (online link):** Penny asks Claude to read the picture. The first time, it asks your permission. If you say no, your photo still shows up so you can type the numbers in.
- **Photos and scanned PDFs (downloaded folder):** a free text reader (Tesseract) reads them on your computer. It needs internet the first time and takes 10 to 30 seconds.
- **Category guess:** first your auto-sort rules, then words on the receipt like "pharmacy" or "pizza". Tick "Always sort this store" and next time it's instant.
- **Safety checks:** files over 20 MB, empty files, broken pictures, locked PDFs and file types it can't read all show a friendly message instead of an error. If the same amount on the same date is already logged, you get a "this might be a repeat" warning.
- **iPhone tip:** if a HEIC photo won't open, take a screenshot of the receipt, or set Settings, Camera, Formats to "Most Compatible".

## Feed Penny (monthly coin belly)

Penny's belly starts empty on the 1st of every month. Money chores feed her coins, up to 100:

| Chore | Coins | How it's counted |
|---|---|---|
| Log 10 transactions | 15 | automatic |
| Bring in a bank statement or scan a receipt | 10 | automatic |
| Review your bills and subscriptions | 10 | automatic |
| Update your account balances | 15 | automatic |
| Pay yourself first (savings, TFSA, RRSP or a goal) | 15 | automatic |
| Peek at your budget | 5 | automatic |
| Pay your credit card in full | 10 | tap Done (or "I don't have one" once) |
| Weekly check-in (open Penny on 2+ days a week) | 5 a week | automatic |

Her mood compares your coins with where an even pace would be today, so early in the month she's never "behind". Fall behind and she gets peckish, then hungry (Home shows it too). Every chore pops up a celebration with the coins. A full belly gives +75 XP, and 80+ coins at month end is a happy month (+100 XP).

Change chores, coins, cheers or moods in `config.js` under `FEED PENNY`. Each chore has a `check` (or `progress`) that looks at your data for this month.

**Pictures for her moods:** add `belly-stuffed`, `belly-happy`, `belly-ok`, `belly-peckish` and `belly-hungry` to `mascotImages` once you have them. Until then she borrows celebrate, proud, happy, thinking and sad.

## Sync setup (phone + laptop)

Sync uses Supabase, a free online database. You set it up once and everyone using your link (you and your friends) can sync. Each person signs in with their own email and only ever sees their own data.

1. Go to **supabase.com**, sign up for free and press **New project**. Name it `penny-pal`, pick the **Canada (Central)** region and let it make a database password (you won't need it here).
2. When it's ready, open **SQL Editor**, paste this and press **Run**:

```sql
create table if not exists public.penny_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.penny_data enable row level security;
create policy "read own" on public.penny_data for select using (auth.uid() = user_id);
create policy "add own" on public.penny_data for insert with check (auth.uid() = user_id);
create policy "change own" on public.penny_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.penny_data for delete using (auth.uid() = user_id);
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.penny_data to authenticated;
revoke all on public.penny_data from anon;
```

If sync still says "permission denied", run this fix-it script in the SQL Editor (safe to run more than once):

```sql
alter table public.penny_data enable row level security;
drop policy if exists "read own" on public.penny_data;
drop policy if exists "add own" on public.penny_data;
drop policy if exists "change own" on public.penny_data;
drop policy if exists "delete own" on public.penny_data;
create policy "read own" on public.penny_data for select to authenticated using (auth.uid() = user_id);
create policy "add own" on public.penny_data for insert to authenticated with check (auth.uid() = user_id);
create policy "change own" on public.penny_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.penny_data for delete to authenticated using (auth.uid() = user_id);
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.penny_data to authenticated;
revoke all on public.penny_data from anon;
```

(The two `grant` lines matter on newer Supabase projects, which don't give signed-in users access to new tables automatically. Without them, sync says "permission denied for table penny_data".)

3. Open **Authentication**, then **Sign In / Providers**, then **Email**. Turn **Confirm email** off (so people can sign in right away) and save.
4. Open **Project Settings**, then **API Keys** (or **Data API**). Copy the **Project URL** and the **anon public** (or **publishable**) key into `sync` near the top of `config.js`.

The anon key is safe to be public. The rules in step 2 are what keep everyone's data private.

**Privacy and security**

- Each person's data is locked (AES-256 encryption) with a key made from their own password, right on their device, before it's sent. Supabase only ever stores scrambled text. Not even you, as the owner of the Supabase project, can read your friends' money data.
- The database rules from step 2 also stop anyone from reading or changing someone else's row, even scrambled.
- The website has a strict security policy that only lets it load code from itself and three trusted libraries, and only talk to Supabase and the weather service.
- Because only the password can unlock synced data, a forgotten password can't be reset. The copy on each device is still fine, and you can download a backup.
- To keep your Supabase account safe: use a strong password for supabase.com, turn on two-factor login (Account, Security), and never share the service_role or secret key. In Authentication, Providers, Email you can also raise the minimum password length to 8.

**How it behaves**

- My Stash has a **Sync my phone and laptop** card. Create an account on one device, then sign in with the same email and password on the others.
- Changes save to your account a couple of seconds after you make them, and other devices pick them up when you open or switch back to the app (and every minute while it's open).
- If two devices change things at the same moment, the most recent change wins.
- Offline? Changes wait on the device and sync when you're back online.
- Sync works on the website. The preview inside Claude can't connect to outside servers, so it shows a link to the website instead.
- Forgot your password? There's no reset button yet. You can delete the user in Supabase (Authentication, Users) and they can sign up again from a device that has their data.

## Reports, notes, splits and more

- **Snout Reports (Reports page):** every month of the year (money in, spent, saved), this month vs last month, this year vs last year, and a 12 month trend for any category. "Year summary (CSV)" downloads the whole year.
- **Penny noticed (Home):** up to 3 short notes from your own numbers, like a budget moving fast, card debt while cash sits in chequing, or how many months your cash would last. "Not now" hides a note for the rest of the month.
- **Split a purchase:** edit a transaction and tap Split. One Costco trip can be part Groceries, part Shopping. The parts always add up to the total, and a statement with the full amount is still caught as a duplicate. "Undo split" joins them back.
- **Recently deleted:** deleting a transaction, bill, goal, account or reminder shows an Undo. Everything waits on My data for 30 days, then it's gone for good.
- **Roll over:** edit a budget category and tick Roll over. Money you don't spend carries into next month, and going over takes it off next month. It counts from the month you turn it on.
- **Auto-updating balances:** edit an account and tick "Keep this balance up to date". From then on, transactions linked to that account move it (money in adds, money out takes away, and the other way round for a credit card). Link a transaction when you add or edit it, or pick the account when you import a file. A statement balance resets the starting point, so nothing is counted twice.
- **Returns:** money back from a store (a return on your card) goes to Returns. It comes off the budget it was bought in instead of counting as income. Edit a return to change which budget it comes off.

## What it can't do (and why)

- **Connect to your bank automatically.** Apps that do this pay companies like Plaid or Flinks per user. Bank CSV import gets you the same data for free.
- **Pull your credit score.** That also needs a paid service. Most bank apps show it free, and you can log it on the Net worth page.
- **Send phone notifications.** The Reminders page and Home show what's coming up. Open the app daily to keep your streak.
- **File your taxes.** The Taxes page is an estimate for employees. It skips self-employment, capital gains, medical and donation credits. Use certified tax software (several are free) to file.

None of this is financial advice. It's a planning tool to help you understand your money.
