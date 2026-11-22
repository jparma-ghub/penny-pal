/* =====================================================================
   PENNY PAL  -  config.js
   ---------------------------------------------------------------------
   This is the file you'll edit most. It holds every number, list and
   piece of text that isn't "code". Change something, save, refresh
   the browser. Your saved data is not touched.

   Sections (use Ctrl+F / Cmd+F to jump):
     1. BASICS            your currency and city
     2. TAX NUMBERS       Canada + Ontario 2026  (update every year!)
     3. ACCOUNT LIMITS    RRSP, TFSA, FHSA, Home Buyers' Plan
     4. HOME BUYING       Ontario + Toronto land transfer tax
     5. RETIREMENT        CPP / OAS estimates and return presets
     6. CATEGORIES        starting spending categories
     7. AUTO RULES        words in a bank description -> category
     8. LEVELS            XP needed for each level
     9. QUESTS            starter missions + weekly quests that refresh every Monday
    10. BADGES            achievements
    10b. MONEY PATH       the step-by-step checklist page
    10c. CHEERS           the celebration pop-ups
    10d. CHECK-IN         the money check-in quiz and fun facts (with sources)
    11. LESSONS           the Learn page
    12. CALENDAR          built-in yearly reminders
    13. CANCEL + NEGOTIATE scripts for bills and subscriptions
   ===================================================================== */

window.CONFIG = {

  /* ---------- 1. BASICS ---------- */
  appName: "Penny Pal",
  // Bump this when you change the app, and REPLACE whatsNew with only that update's changes.
  // People who already use the app see a "What's new" popup once. Keep it short.
  version: "5.0",
  whatsNew: [
    "🔍 Uploaded something twice? Penny now flags possible duplicates and leaves them unticked. If one is really a new purchase, tick it to keep it",
    "🔁 E-transfers to a person (even one with your name) stay as normal spending. Interbank transfer is only for clear transfers and credit card payments",
  ],
  locale: "en-CA",
  currency: "CAD",
  city: "Toronto",
  province: "Ontario",

  /* ---------- 0. FIRST-TIME SETUP ----------
     The step-by-step questions a brand-new profile sees. One step per screen.
     Field types:
       text   saves words (path "profile.name")
       money  saves a dollar amount. path can be:
                "tax.income"          your yearly income
                "cat.<category id>"   a monthly budget, like "cat.rent"
                "acct.<account type>" an account balance, like "acct.tfsa" or "acct.cc"
       choice tap one option (path "tax.payFrequency")
       subs   tap the subscriptions you have (amounts are typical prices, change them later)
       goal   pick a first goal and how much
     {left} in a cheer is replaced with how many steps are left. */
  // Page names: [cute name, plain name shown small underneath, funny subtitle]
  pageNames: {
    home: ["Penny's Pen", "Home", ""],
    path: ["Piggy Quests", "Your money plan", "One trotter in front of the other. This is the order that works for most Canadians to go from stressed to steady. No rush, no judgment. 🌱"],
    spending: ["Transoinktions", "Transactions", "Every penny in and out, in one place. Fix a category right in the list and Penny learns. Smart piggy."],
    budgets: ["Budget Trough", "Budgets", "Give every dollar a job (and a snack). Change any amount and it saves right away."],
    bills: ["Bills", "& subscriptions", "The sneaky charges that come back every month. Find the ones you forgot about and give them the boot. 👢"],
    goals: ["Hog Goals", "Savings goals", "Trips, a first home, a safety net. Feed your goals a little at a time and watch them grow."],
    networth: ["The Pig Picture", "Net worth", "What you own minus what you owe. Step back and see the pig picture. 🖼️"],
    taxes: ["Oinktario Taxes", "Taxes", "See your refund before you file, and how much your RRSP and FHSA save you. Way less boar-ing than it sounds."],
    retirement: ["Retirement", "", "If I put money in my RRSP or TFSA now, how much will I have later? Future you, lounging in clover. 🍀"],
    house: ["Home Sweet Sty", "Buy a home", "What a first home really costs in cash, land transfer tax and all. Every piggy deserves a cozy sty."],
    learn: ["Piggy School", "Learn", "Bite-sized money lessons in plain English, made for Canada. Ace the quiz for XP. No snoozing (unless you're Penny)."],
    rewards: ["Truffle Trophies", "Rewards", "XP for good money habits. Tap any quest to jump right to it. Sow proud of you! 🐷"],
    reminders: ["Oink Alerts", "Reminders", "Bills, tax dates and your own notes for the next 12 months. Penny's got your back."],
    mydata: ["My Stash", "My data", "Your settings, backups and syncing between your phone and laptop. Nothing costs a penny."]
  },
  // Sync between phone and laptop (Supabase). See "Sync setup" in GUIDE.md.
  // Leave url empty to turn sync off. The anon key is meant to be public:
  // the database rules only let each person read and change their own data.
  sync: {
    url: "https://rineygmstdjhregngbrd.supabase.co",        // e.g. "https://abcdefgh.supabase.co"
    anonKey: "sb_publishable_n2_WhsMlH06_1dwkfY01aw_8-kbQUE8",    // the "anon public" or "publishable" key
    website: "https://jparma-ghub.github.io/penny-pal/"
  },

  /* ---------- MERCHANT GUIDE (smarter auto-sort) ----------
     Penny checks your own auto-sort rules first, then this list, then words like "pizza" or "pharmacy".
     Add a store by putting its name (as it shows on your bank statement) in the right list.
     Longer names win, so "COSTCO GAS" goes to transit even though "COSTCO" is groceries. */
  merchantGuide: {
    groceries: ["LOBLAWS", "NO FRILLS", "NOFRILLS", "METRO", "SOBEYS", "FRESHCO", "FOOD BASICS", "FORTINOS", "ZEHRS", "REAL CANADIAN SUPERSTORE", "RCSS", "SUPERSTORE", "COSTCO", "COSTCO WHOLESALE", "T&T", "T & T", "T AND T", "LONGOS", "LONGO'S", "FARM BOY", "WHOLE FOODS", "WHOLEFDS", "SAFEWAY", "SAVE ON FOODS", "IGA", "MAXI", "PROVIGO", "INDEPENDENT GROCER", "YOUR INDEPENDENT", "VALU-MART", "VALUMART", "FOODLAND", "H MART", "NATIONS FRESH", "ADONIS", "GALLERIA SUPERMARKET", "PUSATERI", "HIGHLAND FARMS", "BULK BARN", "INSTACART", "VOILA", "PC EXPRESS", "WALMART SUPERCENTRE GROCERY", "FIESTA FARMS", "OCEANS FRESH", "BTRUST", "SUPERMARKET", "GROCERY", "GROCERIES"],
    dining: ["UBER EATS", "UBEREATS", "UBER *EATS", "DOORDASH", "SKIP THE DISHES", "SKIPTHEDISHES", "RITUAL", "FANTUAN", "MCDONALD", "MCDONALDS", "BURGER KING", "WENDY'S", "WENDYS", "A&W", "HARVEY'S", "HARVEYS", "KFC", "POPEYES", "SUBWAY", "PIZZA PIZZA", "DOMINO'S", "DOMINOS", "PIZZA HUT", "PAPA JOHN", "LITTLE CAESARS", "PIZZA NOVA", "CHIPOTLE", "FRESHII", "OSMOW", "MARY BROWN", "SWISS CHALET", "BOSTON PIZZA", "EAST SIDE MARIO", "THE KEG", "MONTANA'S", "KELSEY'S", "JACK ASTOR", "MILESTONES", "EARLS", "CACTUS CLUB", "JOEY", "MOXIES", "ST-HUBERT", "BURRITO BOYZ", "MUCHO BURRITO", "FIVE GUYS", "CHICK-FIL-A", "TACO BELL", "NANDO", "PANERA", "DENNY'S", "IHOP", "SMASHBURGER", "PHO", "THAI", "SUSHI", "RAMEN", "UDON", "MARUGAME", "IZAKAYA", "HOT POT", "HOTPOT", "SHAWARMA", "PIZZERIA", "RESTAURANT", "BISTRO", "TAQUERIA", "DIM SUM", "BBQ", "KITCHEN", "DINER", "EATERY", "BAKERY", "PATISSERIE"],
    coffee: ["TIM HORTONS", "TIMS", "TIMHORTONS", "STARBUCKS", "SECOND CUP", "BALZAC", "PILOT COFFEE", "DINEEN", "CAFE", "CAFFE", "COFFEE", "ESPRESSO", "KRISPY KREME", "CHATIME", "COCO FRESH", "GONG CHA", "HEYTEA", "SHARETEA", "XING FU TANG", "MOGE TEE", "BOBA", "THE ALLEY", "PRESOTEA", "BUBBLE TEA", "DAVIDSTEA", "MCCAFE"],
    transit: ["PRESTO", "TTC", "GO TRANSIT", "METROLINX", "UP EXPRESS", "UBER TRIP", "UBER *TRIP", "UBER CANADA/UBERTRIP", "LYFT", "BECK TAXI", "TAXI", "PARKING", "GREEN P", "IMPARK", "INDIGO PARK", "HONK MOBILE", "PRECISE PARKLINK", "PETRO-CANADA", "PETRO CANADA", "ESSO", "SHELL", "ULTRAMAR", "PIONEER", "HUSKY", "CHEVRON", "CANADIAN TIRE GAS", "CDN TIRE GAS", "COSTCO GAS", "MOBIL", "407 ETR", "BIKE SHARE", "ZIPCAR", "COMMUNAUTO", "ENTERPRISE RENT", "BUDGET RENT", "MIWAY", "YRT", "VIVA", "BRAMPTON TRANSIT", "DRT", "OC TRANSPO", "STM"],
    utilities: ["TORONTO HYDRO", "ALECTRA", "HYDRO ONE", "ENBRIDGE", "ELEXICON", "HYDRO OTTAWA", "LONDON HYDRO", "ENERCARE", "RELIANCE HOME", "UTILITY", "UTILITIES", "WATER BILL", "CITY OF TORONTO", "HYDRO"],
    phone: ["ROGERS", "BELL CANADA", "BELL MOBILITY", "BELL MTS", "TELUS", "FIDO", "KOODO", "VIRGIN PLUS", "VIRGIN MOBILE", "FREEDOM MOBILE", "PUBLIC MOBILE", "CHATR", "LUCKY MOBILE", "TEKSAVVY", "START.CA", "EASTLINK", "COGECO", "VIDEOTRON", "ACANAC", "DISTRIBUTEL"],
    insurance: ["INTACT", "AVIVA", "TD INSURANCE", "DESJARDINS INSURANCE", "SONNET", "BELAIRDIRECT", "BELAIR", "CO-OPERATORS", "COOPERATORS", "MANULIFE", "SUN LIFE", "CANADA LIFE", "RBC INSURANCE", "ALLSTATE", "STATE FARM", "WAWANESA", "SQUARE ONE", "SECURIAN", "GREEN SHIELD", "INSURANCE", "ASSURANCE"],
    health: ["SHOPPERS DRUG MART", "SHOPPERS DRUG", "SDM", "REXALL", "LONDON DRUGS", "JEAN COUTU", "PHARMASAVE", "GUARDIAN PHARMACY", "IDA PHARMACY", "PHARMACY", "PHARMACIE", "DRUG MART", "DENTAL", "DENTIST", "OPTOMETRY", "OPTOMETRIST", "OPTICAL", "PHYSIO", "MASSAGE", "CHIRO", "CLINIC", "HOSPITAL", "MEDICAL", "LIFELABS", "DYNACARE", "WELL.CA", "GOODLIFE", "FIT4LESS", "PLANET FITNESS", "LA FITNESS", "ANYTIME FITNESS", "YMCA", "ORANGETHEORY", "F45", "BARRY'S", "YOGA", "PILATES", "CROSSFIT", "GYM", "FITNESS", "HEAD SPA", "DAY SPA", "NAIL SPA", "MASSAGE", "SALON", "BARBER", "NAILS", "HAIR STUDIO"],
    subs: ["NETFLIX", "SPOTIFY", "DISNEY PLUS", "DISNEYPLUS", "DISNEY+", "CRAVE", "APPLE.COM/BILL", "APPLE.COM BILL", "ITUNES", "ICLOUD", "GOOGLE STORAGE", "GOOGLE ONE", "GOOGLE *YOUTUBE", "YOUTUBE PREMIUM", "YOUTUBEPREMIUM", "AMAZON PRIME", "PRIME VIDEO", "AMZN PRIME", "AUDIBLE", "PATREON", "ADOBE", "MICROSOFT 365", "MICROSOFT*", "XBOX", "PLAYSTATION", "NINTENDO", "CHATGPT", "OPENAI", "DROPBOX", "CANVA", "DUOLINGO", "PARAMOUNT", "HAYU", "BRITBOX", "DAZN", "SPORTSNET", "TSN", "NYTIMES", "GLOBE AND MAIL", "MEDIUM", "SUBSTACK", "NOTION", "GRAMMARLY", "LINKEDIN PREMIUM", "UBER ONE", "DASHPASS", "SKIP PLUS", "SUBSCRIPTION"],
    fun: ["CINEPLEX", "LANDMARK CINEMAS", "IMAX", "TICKETMASTER", "STUBHUB", "LIVE NATION", "EVENTBRITE", "LCBO", "BEER STORE", "WINE RACK", "SQDC", "OCS", "CANNABIS", "TOKYO SMOKE", "SPIRIT LEAF", "BAR", "PUB", "LOUNGE", "BREWERY", "BREWING", "KARAOKE", "BOWLING", "ESCAPE ROOM", "STEAM GAMES", "STEAMPOWERED", "EPIC GAMES", "RIPLEY'S", "CANADA'S WONDERLAND", "WONDERLAND", "ROM", "AGO", "MUSEUM", "ZOO", "GOLF", "SKI", "THEATRE", "THEATER", "CONCERT", "ARCADE", "TOPGOLF", "REC ROOM"],
    shopping: ["AMAZON", "AMZN", "AMAZON.CA", "WALMART", "WAL-MART", "CANADIAN TIRE", "CDN TIRE", "HOME DEPOT", "LOWE'S", "LOWES", "RONA", "IKEA", "BEST BUY", "BESTBUY", "STAPLES", "THE BAY", "HUDSON'S BAY", "HUDSONS BAY", "WINNERS", "HOMESENSE", "MARSHALLS", "SPORT CHEK", "SPORTCHEK", "SPORTING LIFE", "MEC", "LULULEMON", "ARITZIA", "H&M", "ZARA", "UNIQLO", "GAP", "OLD NAVY", "ROOTS", "SIMONS", "NORDSTROM", "SEPHORA", "INDIGO", "CHAPTERS", "DOLLARAMA", "DOLLAR TREE", "GIANT TIGER", "SHEIN", "TEMU", "ETSY", "EBAY", "ALIEXPRESS", "APPLE STORE", "THE SOURCE", "STRUCTUBE", "WAYFAIR", "MUJI", "MINISO", "URBAN OUTFITTERS", "FOOT LOCKER", "NIKE", "ADIDAS", "DSW", "ALDO", "LA SENZA", "VICTORIA'S SECRET", "BATH & BODY", "MICHAELS", "PARTY CITY", "TOYS R US", "MASTERMIND", "PET VALU", "PETSMART", "PETLAND", "ARDENE", "GARAGE", "DYNAMITE", "SAAN", "HUDSON", "PENNINGTONS", "REITMANS", "COSTCO.CA", "WALMART.CA", "BEST BUY CANADA", "MALL"],
    gifts: ["FLORIST", "FLOWERS", "1-800-FLOWERS", "HALLMARK", "GIFT CARD", "GIFT SHOP", "GIFTS"],
    rent: ["RENT", "LANDLORD", "PROPERTY MANAGEMENT", "PROPERTY MGMT", "MORTGAGE", "CONDO FEES", "MAINTENANCE FEE", "TENANT"],
    invest: ["WEALTHSIMPLE", "QUESTRADE", "QTRADE", "TD DIRECT INVESTING", "RBC DIRECT INVESTING", "INTERACTIVE BROKERS", "MOOMOO", "NATIONAL BANK DIRECT", "TFSA", "RRSP", "FHSA", "INVESTMENT", "MUTUAL FUND", "GIC"],
    emergency: ["EMERGENCY FUND"],
    // money coming in
    gov: ["CRA", "CANADA REVENUE", "CANADA RE", "GST CREDIT", "HST CREDIT", "GST/HST", "CANADA CHILD", "CCB", "EMPLOYMENT INSURANCE", "EI CANADA", "CANADA PENSION", "OLD AGE SECURITY", "TRILLIUM", "ONTARIO TRILLIUM", "CLIMATE ACTION", "CARBON REBATE", "CANADA CARBON", "TAX REFUND", "REFUND", "RETURN", "REVERSAL", "REBATE", "CASHBACK", "CASH BACK", "OSAP", "SCHOLARSHIP", "BURSARY"],
    pay: ["PAYROLL", "SALARY", "DIRECT DEP", "DIRECT DEPOSIT", "PAY CHEQUE", "PAYCHEQUE", "WAGES"],
    side: ["ETSY PAYOUT", "SHOPIFY PAYOUT", "STRIPE", "PAYPAL TRANSFER", "UBER DRIVER", "DOORDASH DASHER", "SQUARE PAYOUT", "INVOICE"]
  },

  /* ---------- FEED PENNY (monthly coin belly) ----------
     Penny's belly starts empty on the 1st of every month. Money chores feed her coins.
     Her mood follows your pace through the month, so she only gets hungry if you fall behind.
     check(s, M) says if a chore is done this month. M.ym is "2026-11", M.inMonth(date) is true for dates this month.
     go = where tapping the chore takes you (same as quests). Coins should add up to 100. */
  feedPenny: {
    on: true,
    weeklyCoins: 5,          // per week where you open Penny on 2+ different days (4 weeks = 20 coins)
    weeklyDays: 2,
    weeklyCheer: "Two check-ins this week! Little habits make a big piggy.",
    fullXp: 75,              // when her belly hits 100 in a month
    goodMonth: 80,           // coins needed for a "happy month" at month end
    goodMonthXp: 100,
    chores: [
      { id: "log", emoji: "🧾", title: "Log 10 transactions", coins: 15, cheer: "10 transactions logged this month! You know exactly where your money goes.", go: { page: "spending", act: "addTx" },
        progress: (s, M) => [s.transactions.filter((t) => !t.example && M.inMonth(t.date)).length, 10] },
      { id: "statement", emoji: "📥", title: "Bring in a bank statement or scan a receipt", coins: 10, cheer: "Statement in! Penny loves fresh numbers.", go: { page: "spending", act: "toggleImport" },
        check: (s, M) => M.inMonth(s.flags.importOn) || s.transactions.some((t) => (t.receipt || t.src === "import") && M.inMonth(t.added)) },
      { id: "bills", emoji: "📺", title: "Review your bills and subscriptions", coins: 10, cheer: "Bills checked! No sneaky charges getting past you.", go: { page: "bills" },
        check: (s, M) => s.subs.some((x) => !x.example && M.inMonth(x.reviewed)) || M.inMonth((s.feed.ticks[M.ym] || {}).bills) },
      { id: "balances", emoji: "🏦", title: "Update your account balances", coins: 15, cheer: "Balances updated! Now you can see the pig picture.", go: { page: "networth" },
        check: (s, M) => s.accounts.some((a) => !a.example && M.inMonth(a.updated)) },
      { id: "payself", emoji: "🐷", title: "Pay yourself first (savings, TFSA, RRSP or a goal)", coins: 15, cheer: "You paid yourself first! Future you says thank you.", go: { page: "goals" },
        check: (s, M) => s.goals.some((g) => (g.history || []).some((h) => M.inMonth(h.date))) || s.transactions.some((t) => !t.example && ["emergency", "invest"].includes(t.cat) && M.inMonth(t.date)) },
      { id: "budget", emoji: "👛", title: "Peek at your budget", coins: 5, cheer: "Budget checked! Knowing is half the battle.", go: { page: "budgets" },
        check: (s, M) => M.inMonth((s.flags.visits || {}).budgets) },
      { id: "card", emoji: "💳", title: "Pay your credit card in full", coins: 10, manual: true, cheer: "You paid your credit card in full! Zero interest for the bank, more coins for Penny.",
        how: "Tap Done once you've paid this month's statement. No credit card? Tap \"I don't have one\".",
        check: (s, M) => !!s.flags.noCreditCard || !!(s.feed.ticks[M.ym] || {}).card }
    ],
    // Penny's moods. "behind" = how many coins short of where you'd be at an even pace today.
    stages: [
      { id: "stuffed", pose: "belly-stuffed", emoji: "🤩", name: "Stuffed and thriving", say: "I'm SO full! Best money month ever. You're amazing!" },
      { id: "happy", pose: "belly-happy", emoji: "😊", name: "Happy and well fed", say: "Yum! I'm feeling great. We're right on track this month." },
      { id: "content", pose: "belly-ok", emoji: "🙂", name: "Doing okay", say: "I'm doing okay! A snack or two would make me even happier." },
      { id: "peckish", pose: "belly-peckish", emoji: "🥺", name: "A little peckish", say: "My tummy's rumbling a bit... could we do a money chore today?" },
      { id: "hungry", pose: "belly-hungry", emoji: "😢", name: "Hungry", say: "I'm really hungry... even one little chore would help so much!" }
    ]
  },

  // The big welcome card each page shows the first time someone opens it.
  // The ? next to every page name opens it again. "say" is Penny's line, "points" are the 3 bullets.
  pageIntros: {
    path: { say: "This is your money plan, one step at a time!", points: ["🗺️ 10 steps in the order that works for most people", "✅ Tick things off as you go. Some tick themselves", "🎉 Every step you finish earns XP and a little party"] },
    spending: { say: "Every penny in and out lives here!", points: ["💸 All your purchases and paycheques in one list", "📸 Scan a receipt, import your bank file or add one by hand", "🏷️ Fix a category in the list and I'll remember it"] },
    budgets: { say: "Let's give every dollar a job!", points: ["👛 Pick a monthly amount for each category", "📊 Bars fill up as you spend. Green means great", "⚖️ The 50/30/20 check shows if your plan fits your pay"] },
    bills: { say: "Let's catch the sneaky repeat charges!", points: ["📺 Everything that charges you again and again", "🔍 I spot repeat charges in your transactions for you", "👢 Mark ones to cancel and see your yearly savings"] },
    goals: { say: "What are we saving up for?", points: ["🎯 A pot for anything: a trip, a home, a safety net", "📅 See how much to save each month to get there", "📷 Add your own photo to keep you excited"] },
    networth: { say: "Here's the pig picture of your money!", points: ["⚖️ What you own minus what you owe", "🏦 Add your accounts and debts about once a month", "📈 Watch it grow, and track your credit score"] },
    taxes: { say: "Taxes, but way less scary. Promise!", points: ["🍁 Federal and Ontario tax for this year", "💰 Add your salary and pay stub to guess your refund", "🧾 See how much an RRSP or FHSA deposit saves you"] },
    retirement: { say: "Let's peek at future you!", points: ["🌅 How much you could have later if you start now", "🔁 Compare RRSP and TFSA side by side", "🍀 CPP and OAS are added for the full picture"] },
    house: { say: "Dreaming of your own cozy sty?", points: ["🔑 The real cash you need to buy a home in Toronto", "🏛️ Down payment, land transfer tax and closing costs", "🏡 Play with the price to see what fits you"] },
    learn: { say: "Time for piggy school! Short and sweet.", points: ["📚 Quick money lessons for Canada, in plain English", "❓ Each one ends with a tiny quiz", "⭐ Get it right for bonus XP"] },
    rewards: { say: "Look at all the stuff you can win!", points: ["🏆 Your level, XP, streak and badges", "🗓️ New weekly quests every Monday", "👆 Tap any quest and I'll take you right to it"] },
    reminders: { say: "I'll help you remember the important stuff!", points: ["🔔 Bills, tax dates and your own reminders", "📆 Looks a year ahead so nothing sneaks up on you", "✍️ Add your own, like \"call Rogers about my plan\""] },
    mydata: { say: "This is where your stuff is kept safe.", points: ["☁️ Turn on sync to see your data on your phone and laptop", "⬇️ Download a backup once a month to keep it extra safe", "⚙️ Settings and starting fresh live here too"] }
  },
  mascotName: "Penny",
  mascotStyle: "P",   // P = the 3D Penny pictures below (A to E are old hand-drawn backups)
  // Penny's poses. Drop a new picture in the img folder and list it here.
  // Any pose without a picture borrows the closest one that exists.
  heroImage: "img/toronto-day-2.webp",
  heroNightImage: "img/toronto-night-2.webp",   // used when a mood has night: true (Penny napping)   // the Toronto skyline behind the Home banner ("" to use the drawn one)
  // Penny's moods on the Home banner. The first one that fits wins, top to bottom.
  // {hello} = Good morning / afternoon / evening, {name} = your name (or nothing)
  // pose = which picture, greeting = the line above the number,
  // say = her speech bubble ("" uses the daily lines below), why = the little note under her
  heroMoods: [
    { id: "calm", when: "Calm mode is on", pose: "calm", greeting: "Hello, calm friend{name} 🍃",
      say: "Deep breath in... and out. Your money can wait a moment.", why: "🧘 Calm mode is on, so Penny is meditating" },
    { id: "over", when: "Over your spending plan this month", pose: "sad", greeting: "{hello}{name} 💛",
      say: "Oh no, we went a little over this month. That's okay! Let's look at it together.", why: "🥺 Over your spending plan this month. It happens!" },
    { id: "sleepy", when: "10 pm to 5 am", night: true, pose: "sleepy", greeting: "Up late{name}? 🌙",
      say: "Zzz... oh! Hi! Don't stay up too late. Your budget will be here tomorrow.", why: "💤 It's late, so Penny is napping (10 pm to 5 am)" },
    { id: "hungry", when: "Penny's belly is low for this point in the month", pose: "belly-hungry", greeting: "{hello}{name} 🥺",
      say: "My tummy's rumbling! Could you feed me one money chore today?", why: "🍽️ Penny's belly is low this month. Do a chore to feed her" },
    { id: "snow", when: "It's snowing in your city", pose: "cozy", greeting: "Brrr, {hello}{name} ❄️",
      say: "It's snowing outside! Perfect day to stay cozy and save.", why: "❄️ It's snowing in Toronto, so Penny bundled up" },
    { id: "happy", when: "Any other time", pose: "happy", greeting: "{hello}{name} ☀️",
      say: "", why: "" }
  ],
  // Snow check for cozy Penny. Uses the free Open-Meteo weather service (no account, nothing personal sent).
  // Only works in the downloaded app: the online artifact blocks outside websites.
  weather: { on: true, latitude: 43.65, longitude: -79.38, checkEveryMinutes: 60 },

  // Things Penny says in her speech bubble on Home. The first one is her hello for new friends.
  pennySays: [
    "Hi, I'm Penny! 🐷 I'm here to help you save, one tiny step at a time.",
    "Every dollar you save is a little seed. Watch it sprout! 🌱",
    "Oink! Checking in is half the battle. Proud of you.",
    "No judgment here. Just you, me and a plan 💛",
    "Small savings add up to big snout-standing things!",
    "Psst! Moving money to savings on payday makes it easy.",
    "You're doing better than you think. Truly! ✨"
  ],
  mascotImages: {
    happy: "img/penny-happy.webp",
    celebrate: "img/penny-celebrate.webp",
    proud: "img/penny-proud.webp",
    coin: "img/penny-coin.webp",
    surprised: "img/penny-surprised.webp",
    comfort: "img/penny-comfort.webp",
    sad: "img/penny-sad.webp",
    thinking: "img/penny-thinking.webp",
    cozy: "img/penny-cozy.webp",
    goodbye: "img/penny-goodbye.webp",
    reading: "img/penny-reading.webp",
    sleepy: "img/penny-sleepy.webp",
    taxes: "img/penny-taxes.webp",
    trophy: "img/penny-trophy.webp",
    explorer: "img/penny-explorer.webp",
    jar: "img/penny-jar.webp",
    growth: "img/penny-growth.webp",
    home: "img/penny-home.webp",
    alarm: "img/penny-alarm.webp",
    calm: "img/penny-calm.webp",
    streak: "img/penny-streak.webp",
    party: "img/penny-party.webp",
    retire: "img/penny-retire.webp"
  },
  setup: {
    xpPerStep: 10,
    xpFinish: 100,
    cheers: ["Oink-credible! {left} more to go ✨", "Sow good! Only {left} left 🐷", "Snout-standing! {left} more and you're done 🌱", "Trotting along! {left} to go 🐾", "Hog wild! {left} more steps 🎈", "Amazing! {left} more to go ✨", "Look at you go! Only {left} left 🙌", "Nice one! {left} more and you're done 🌱", "You're doing great! {left} to go 💛", "Woohoo! {left} more steps 🎈"],
    halfway: "Halfway there! 🎉 You're doing swine-sationally.",
    lastOne: "Last one! You've totally got this, little piggy 🏁",
    steps: [
      { id: "hello", pose: "wave", emoji: "👋", title: "Hi! What should we call you?", sub: "10 tiny questions, about 3 minutes. Skip anything you like. You can change it all later.",
        fields: [{ type: "text", path: "profile.name", label: "Your first name or a nickname", placeholder: "e.g. Sam" }] },
      { id: "income", pose: "coin", emoji: "💼", title: "How much do you earn in a year?", sub: "Before tax. Your offer letter or a pay stub will say. A rough guess is totally fine.",
        fields: [{ type: "money", path: "tax.income", label: "Yearly income", placeholder: "e.g. 55000" }] },
      { id: "pay", pose: "thinking", emoji: "📅", title: "How often do you get paid?", sub: "This helps us work out your paycheques and tax refund.",
        fields: [{ type: "choice", path: "tax.payFrequency", options: [["weekly", "Every week", "🗓️"], ["biweekly", "Every 2 weeks", "📆"], ["semimonthly", "Twice a month", "✌️"], ["monthly", "Once a month", "🌙"]] }] },
      { id: "home", pose: "home", emoji: "🏠", title: "What do you pay for rent or housing each month?", sub: "Rent, mortgage, or what you give your family. Put 0 if nothing.",
        fields: [{ type: "money", path: "cat.rent", label: "Per month", placeholder: "e.g. 1800" }] },
      { id: "basics", pose: "taxes", emoji: "🛒", title: "Your everyday basics", sub: "About how much each month? Guesses are perfect. You'll fine-tune later.",
        fields: [{ type: "money", path: "cat.groceries", label: "🛒 Groceries" }, { type: "money", path: "cat.transit", label: "🚇 TTC, transit or gas" }, { type: "money", path: "cat.phone", label: "📱 Phone and internet" }, { type: "money", path: "cat.utilities", label: "💡 Hydro and utilities" }] },
      { id: "fun", pose: "party", emoji: "🎉", title: "And the fun stuff", sub: "Treats matter too! About how much each month?",
        fields: [{ type: "money", path: "cat.dining", label: "🍜 Eating out and takeout" }, { type: "money", path: "cat.coffee", label: "☕ Coffee" }, { type: "money", path: "cat.fun", label: "🎟️ Going out" }, { type: "money", path: "cat.shopping", label: "🛍️ Shopping" }] },
      { id: "subs", pose: "surprised", emoji: "📺", title: "Which of these do you pay for?", sub: "Tap all that apply. We filled in typical prices. You can fix them anytime on Bills & subs.",
        fields: [{ type: "subs", options: [["Netflix", 18.99, "film", "🎬"], ["Spotify", 11.99, "music", "🎧"], ["Crave", 22.99, "tv", "📺"], ["Disney+", 14.99, "film", "🏰"], ["Amazon Prime", 9.99, "shopping-bag", "📦"], ["YouTube Premium", 13.99, "tv", "▶️"], ["iCloud or Google storage", 3.99, "laptop", "☁️"], ["Gym", 50, "dumbbell", "🏋️"]] }] },
      { id: "debts", pose: "comfort", emoji: "💳", title: "Do you owe anything right now?", sub: "No judgment here, lots of people do. Leave it blank if not. This is just so we can help.",
        fields: [{ type: "money", path: "acct.cc", label: "💳 Credit cards" }, { type: "money", path: "acct.osap", label: "🎓 OSAP or student loans" }, { type: "money", path: "acct.carloan", label: "🚗 Car loan" }, { type: "money", path: "acct.loc", label: "🏦 Line of credit" }] },
      { id: "savings", pose: "coin", emoji: "🐷", title: "What's in your accounts right now?", sub: "Your chequing (everyday money), savings or high-interest savings, TFSA, RRSP and so on. Add as many as you have. Every dollar counts, even $0!",
        fields: [{ type: "accounts", starters: ["chequing", "savings"] }] },
      { id: "goal", pose: "jar", emoji: "🎯", title: "Last one! Pick your first goal", sub: "Something exciting to save for. You can add more later.",
        fields: [{ type: "goal" }] }
    ]
  },

  /* ---------- 2. TAX NUMBERS (tax year 2026) ----------
     Update these each fall. Search: "CRA indexation 2027",
     "Ontario tax brackets 2027", "CPP contribution rates 2027",
     "EI premium rate 2027". Each bracket is [top of bracket, rate]. */
  tax: {
    year: 2026,
    federal: {
      brackets: [[58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.29], [Infinity, 0.33]],
      creditRate: 0.14,          // rate used for non-refundable credits
      basicPersonalMax: 16452,   // basic personal amount (most people)
      basicPersonalMin: 14829,   // what it shrinks to for high incomes
      bpaPhaseStart: 181440,
      bpaPhaseEnd: 258482,
      canadaEmploymentAmount: 1501
    },
    ontario: {
      brackets: [[53891, 0.0505], [107785, 0.0915], [150000, 0.1116], [220000, 0.1216], [Infinity, 0.1316]],
      creditRate: 0.0505,
      basicPersonal: 12989,
      surtax: [[5818, 0.20], [7446, 0.36]],   // extra tax on Ontario tax above these amounts
      lowIncomeReduction: 300                  // Ontario Tax Reduction basic amount (approx.)
    },
    cpp: { ympe: 74600, yampe: 85000, exemption: 3500, rate: 0.0595, baseRate: 0.0495, cpp2Rate: 0.04 },
    ei: { maxInsurable: 68900, rate: 0.0163 }
  },

  /* ---------- 3. ACCOUNT LIMITS ---------- */
  limits: {
    rrspMax: 33810,        // 2026 RRSP dollar limit (or 18% of last year's income, whichever is lower)
    rrspPercent: 0.18,
    tfsaYear: 7000,        // new TFSA room added on Jan 1
    tfsaTotalSince2009: 109000, // total room for someone who was 18+ and in Canada since 2009
    fhsaYear: 8000,
    fhsaLifetime: 40000,
    homeBuyersPlan: 60000  // how much you can borrow from your RRSP for a first home
  },

  /* ---------- 4. HOME BUYING ---------- */
  home: {
    ontarioLTT: [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [Infinity, 0.025]],
    torontoMLTT: [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [3000000, 0.025],
                  [4000000, 0.035], [5000000, 0.045], [10000000, 0.055], [20000000, 0.065], [Infinity, 0.075]],
    ontarioFirstTimeRebate: 4000,
    torontoFirstTimeRebate: 4475,
    insuredMaxPrice: 1500000,     // homes above this need 20% down
    cmhc: [[0.05, 0.04], [0.10, 0.031], [0.15, 0.028]],   // [down payment at least, premium %]
    otherClosingCosts: 3500,      // lawyer, inspection, title insurance, moving (rough)
    pstOnInsurance: 0.08          // Ontario charges 8% sales tax on mortgage insurance, paid in cash
  },

  /* ---------- 5. RETIREMENT ---------- */
  retirement: {
    returnPresets: [
      { name: "Careful", rate: 4, note: "Mostly bonds and GICs" },
      { name: "Balanced", rate: 6, note: "Half stocks, half bonds" },
      { name: "Growth", rate: 7.5, note: "Mostly stock index funds" }
    ],
    inflation: 2.5,
    withdrawRate: 4,          // the "4% rule": take out 4% of your savings each year
    cppMonthlyDefault: 900,   // a typical CPP at 65 (max is about $1,500)
    oasMonthly: 740,          // Old Age Security at 65 (today's dollars)
    retirementTaxRate: 20     // rough tax on RRSP withdrawals in retirement
  },

  /* ---------- 6. CATEGORIES ----------
     group: need | want | save | income
     icon: any name from icons.js   color: any CSS color */
  categories: [
    { id: "rent", name: "Rent", icon: "house", color: "#7aa6d9", group: "need", budget: 1900 },
    { id: "groceries", name: "Groceries", icon: "shopping-cart", color: "#6fb79a", group: "need", budget: 450 },
    { id: "utilities", name: "Hydro & utilities", icon: "zap", color: "#e3b45f", group: "need", budget: 90 },
    { id: "phone", name: "Phone & internet", icon: "smartphone", color: "#9aa3e3", group: "need", budget: 130 },
    { id: "transit", name: "TTC & transit", icon: "train-front", color: "#e08e8e", group: "need", budget: 160 },
    { id: "insurance", name: "Insurance", icon: "shield", color: "#8aa3b0", group: "need", budget: 40 },
    { id: "health", name: "Health & fitness", icon: "heart-pulse", color: "#e39bb6", group: "need", budget: 80 },
    { id: "coffee", name: "Coffee", icon: "coffee", color: "#b08e74", group: "want", budget: 50 },
    { id: "dining", name: "Eating out", icon: "utensils", color: "#eba277", group: "want", budget: 220 },
    { id: "fun", name: "Going out & fun", icon: "party-popper", color: "#c59ad8", group: "want", budget: 150 },
    { id: "shopping", name: "Shopping", icon: "shopping-bag", color: "#e39bbd", group: "want", budget: 150 },
    { id: "subs", name: "Subscriptions", icon: "repeat", color: "#9d94ea", group: "want", budget: 50 },
    { id: "gifts", name: "Gifts", icon: "gift", color: "#dd8fa4", group: "want", budget: 40 },
    { id: "travel", name: "Travel", icon: "plane", color: "#7cb8d6", group: "want", budget: 100 },
    { id: "emergency", name: "Emergency fund", icon: "umbrella", color: "#6cbab3", group: "save", budget: 200 },
    { id: "invest", name: "TFSA / RRSP", icon: "trending-up", color: "#5fae7c", group: "save", budget: 300 },
    { id: "pay", name: "Paycheque", icon: "briefcase", color: "#5fae7c", group: "income", budget: 0 },
    { id: "side", name: "Side hustle", icon: "sparkles", color: "#e3b45f", group: "income", budget: 0 },
    { id: "gov", name: "Refunds & benefits", icon: "landmark", color: "#7aa6d9", group: "income", budget: 0 },
    // offset: true = not income. It lowers your spending instead (a friend paying back their share)
    { id: "payback", name: "Friends paying me back", icon: "hand-coins", color: "#e3b45f", group: "income", offset: true, budget: 0 },
    // group "transfer" = moving your own money between accounts. Not spending, not income
    { id: "transfer", name: "Interbank transfer", icon: "refresh-cw", color: "#a3abbd", group: "transfer", budget: 0 }
  ],


  /* ---------- GOALS + ACCOUNTS ---------- */
  goalAccounts: ["TFSA", "FHSA", "RRSP", "HISA", "Chequing", "RESP", "Other"],
  goalTemplates: [
    { name: "Trip", icon: "plane", theme: 0, account: "TFSA", target: 4000 },
    { name: "First home", icon: "key-round", theme: 2, account: "FHSA", target: 60000 },
    { name: "Emergency fund", icon: "umbrella", theme: 4, account: "HISA", target: 8000 },
    { name: "Car", icon: "car", theme: 6, account: "TFSA", target: 15000 },
    { name: "Wedding", icon: "heart", theme: 3, account: "TFSA", target: 20000 },
    { name: "School", icon: "graduation-cap", theme: 5, account: "TFSA", target: 6000 },
    { name: "New laptop", icon: "laptop", theme: 7, account: "HISA", target: 1800 },
    { name: "Holiday gifts", icon: "gift", theme: 1, account: "Chequing", target: 600 }
  ],
  // Cover colours for goal cards: [from, to]
  goalThemes: [["#a8d8d0", "#a9b8ec"], ["#f6c1a6", "#eeb0cf"], ["#b9e0b8", "#9fd3cc"], ["#c8b6ee", "#eeb0cf"],
               ["#a9d3ee", "#c2e5f5"], ["#f2d58f", "#f3b79a"], ["#c3cad6", "#a5afc2"], ["#f1aab8", "#f6d39b"]],
  swatches: ["#7aa6d9", "#6fb79a", "#e3b45f", "#9aa3e3", "#e08e8e", "#8aa3b0", "#e39bb6", "#b08e74", "#eba277", "#c59ad8", "#e39bbd", "#9d94ea", "#6cbab3", "#5fae7c"],
  // kind: asset (you own it) or debt (you owe it)
  accountTypes: [
    { id: "chequing", name: "Chequing", icon: "wallet", kind: "asset" },
    { id: "savings", name: "Savings / HISA", icon: "piggy-bank", kind: "asset" },
    { id: "tfsa", name: "TFSA", icon: "trending-up", kind: "asset" },
    { id: "rrsp", name: "RRSP", icon: "sunset", kind: "asset" },
    { id: "fhsa", name: "FHSA", icon: "key-round", kind: "asset" },
    { id: "resp", name: "RESP", icon: "graduation-cap", kind: "asset" },
    { id: "invest", name: "Other investments", icon: "coins", kind: "asset" },
    { id: "home", name: "Home", icon: "house", kind: "asset" },
    { id: "car", name: "Car", icon: "car", kind: "asset" },
    { id: "cc", name: "Credit card", icon: "credit-card", kind: "debt" },
    { id: "loc", name: "Line of credit", icon: "banknote", kind: "debt" },
    { id: "osap", name: "OSAP / student loan", icon: "graduation-cap", kind: "debt" },
    { id: "carloan", name: "Car loan", icon: "car-front", kind: "debt" },
    { id: "mortgage", name: "Mortgage", icon: "building-2", kind: "debt" },
    { id: "otherdebt", name: "Other debt", icon: "receipt", kind: "debt" }
  ],

  /* ---------- 7. AUTO RULES ----------
     If a bank description CONTAINS the words on the left, it goes in the
     category on the right (use the category id). Not case sensitive. */
  autoRules: [
    ["TIM HORTONS", "coffee"], ["STARBUCKS", "coffee"], ["SECOND CUP", "coffee"], ["BALZAC", "coffee"],
    ["LOBLAWS", "groceries"], ["NO FRILLS", "groceries"], ["METRO", "groceries"], ["SOBEYS", "groceries"],
    ["FRESHCO", "groceries"], ["FOOD BASICS", "groceries"], ["FARM BOY", "groceries"], ["T&T", "groceries"],
    ["COSTCO", "groceries"], ["WALMART", "groceries"], ["REAL CANADIAN", "groceries"], ["LONGO", "groceries"],
    ["PRESTO", "transit"], ["TTC", "transit"], ["GO TRANSIT", "transit"], ["UP EXPRESS", "transit"],
    ["UBER TRIP", "transit"], ["LYFT", "transit"], ["BIKE SHARE", "transit"],
    ["UBER EATS", "dining"], ["SKIP", "dining"], ["DOORDASH", "dining"], ["MCDONALD", "dining"], ["A&W", "dining"],
    ["NETFLIX", "subs"], ["SPOTIFY", "subs"], ["CRAVE", "subs"], ["DISNEY", "subs"], ["APPLE.COM/BILL", "subs"],
    ["PRIME", "subs"], ["YOUTUBE", "subs"], ["AUDIBLE", "subs"],
    ["ROGERS", "phone"], ["BELL", "phone"], ["TELUS", "phone"], ["FIDO", "phone"], ["VIRGIN", "phone"],
    ["KOODO", "phone"], ["FREEDOM", "phone"], ["PUBLIC MOBILE", "phone"],
    ["TORONTO HYDRO", "utilities"], ["ENBRIDGE", "utilities"], ["ALECTRA", "utilities"],
    ["GOODLIFE", "health"], ["FIT4LESS", "health"], ["SHOPPERS DRUG", "health"], ["REXALL", "health"],
    ["LCBO", "fun"], ["BEER STORE", "fun"], ["CINEPLEX", "fun"], ["TICKETMASTER", "fun"],
    ["AMAZON", "shopping"], ["CANADIAN TIRE", "shopping"], ["WINNERS", "shopping"], ["UNIQLO", "shopping"],
    ["PAYROLL", "pay"], ["DIRECT DEP", "pay"], ["SALARY", "pay"],
    ["CANADA PRO", "gov"], ["GST", "gov"], ["ONTARIO TRILLIUM", "gov"], ["CRA", "gov"]
  ],

  /* ---------- 8. LEVELS ---------- */
  levels: [
    { xp: 0, name: "Penny Starter" },
    { xp: 100, name: "Nickel Newbie" },
    { xp: 250, name: "Dime Learner" },
    { xp: 450, name: "Quarter Planner" },
    { xp: 700, name: "Loonie Tracker" },
    { xp: 1000, name: "Toonie Saver" },
    { xp: 1400, name: "Budget Builder" },
    { xp: 1900, name: "Maple Money Pro" },
    { xp: 2600, name: "Savings Champion" },
    { xp: 3500, name: "Finance Legend" }
  ],
  xp: { logTransaction: 5, addToGoal: 15, finishLesson: 25, perfectQuiz: 10, dailyCheckIn: 5 },

  /* ---------- 9. QUESTS ----------
     Starter quests: done once, forever.
     check(s) gets your saved data and returns true when done.
     go: where tapping the quest takes you.
       page:  which page to open (the part after # in the address)
       act:   a button on that page to press for you (opens its popup)
       focus: a box on that page to highlight so you can type in it
     fallback: a button to press instead if that box isn't there yet */
  quests: [
    { id: "income", icon: "briefcase", title: "Tell the app your income", how: "Taxes page, first box", xp: 50, go: { page: "taxes", focus: '[data-bind="tax.income"]' }, check: (s) => s.tax.income > 0 && !s.isExample },
    { id: "firstTx", icon: "receipt", title: "Log your first expense", how: "Press + Add anywhere", xp: 20, go: { act: "addTx" }, check: (s) => s.transactions.some((t) => t.kind === "expense" && !t.example) },
    { id: "tenTx", icon: "list-checks", title: "Log 10 transactions", how: "Or import your bank file", xp: 50, go: { act: "addTx" }, check: (s) => s.transactions.filter((t) => !t.example).length >= 10 },
    { id: "budgets", icon: "wallet", title: "Set a budget for 5 categories", how: "Budgets page", xp: 50, go: { page: "budgets", focus: '[data-change="catBudget"]' }, check: (s) => s.categories.filter((c) => c.group !== "income" && c.budget > 0 && c.touched).length >= 5 },
    { id: "goal", icon: "target", title: "Create a savings goal", how: "Goals page", xp: 40, go: { page: "goals", act: "editGoal" }, check: (s) => s.goals.some((g) => !g.example) },
    { id: "goalDeposit", icon: "piggy-bank", title: "Put money toward a goal", how: "Goals page, + Add money", xp: 30, go: { page: "goals", act: "goalMoney" }, check: (s) => s.flags.goalDeposit },
    { id: "subs", icon: "repeat", title: "List your subscriptions", how: "Bills & subs page", xp: 30, go: { page: "bills", act: "editSub" }, check: (s) => s.subs.some((x) => !x.example) },
    { id: "cancel", icon: "scissors", title: "Cancel one thing you don't use", how: "Bills & subs, mark it cancelled", xp: 100, go: { page: "bills", focus: '[data-change="subStatus"]', fallback: "editSub" }, check: (s) => s.subs.some((x) => x.status === "cancelled" && !x.example) },
    { id: "networth", icon: "scale", title: "Add 2 accounts to see your net worth", how: "Net worth page", xp: 50, go: { page: "networth", act: "editAcct" }, check: (s) => s.accounts.filter((a) => !a.example).length >= 2 },
    { id: "lessons3", icon: "graduation-cap", title: "Finish 3 lessons", how: "Learn page", xp: 60, go: { page: "learn", focus: ".next-lesson" }, check: (s) => Object.keys(s.profile.lessons).length >= 3 },
    { id: "retire", icon: "sunset", title: "Try the retirement calculator", how: "Retirement page", xp: 40, go: { page: "retirement", focus: '[data-bind="retire.lump"]' }, check: (s) => s.flags.retire },
    { id: "house", icon: "key-round", title: "See what a Toronto home really costs", how: "Buy a home page", xp: 40, go: { page: "house", focus: '[data-bind="house.price"]' }, check: (s) => s.flags.house },
    { id: "import", icon: "upload", title: "Import a file from your bank", how: "Transactions page, Import", xp: 60, go: { page: "spending", act: "toggleImport" }, check: (s) => s.flags.imported },
    { id: "credit", icon: "credit-card", title: "Write down your credit score", how: "Net worth page", xp: 30, go: { page: "networth", focus: 'input[name="score"]' }, check: (s) => s.credit.some((c) => !c.example) },
    { id: "backup", icon: "download", title: "Back up your data", how: "My data page", xp: 30, go: { page: "mydata", focus: '[data-act="backup"]' }, check: (s) => s.flags.backup },
    { id: "checkin", icon: "smile", title: "Take the 1-minute money check-in", how: "Quick yes/no questions, with good news", xp: 30, go: { page: "path", act: "startCheckin" }, check: (s) => !!(s.checkin && s.checkin.done) },
    { id: "path1", icon: "route", title: "Finish a step in Piggy Quests", how: "Piggy Quests page", xp: 40, go: { page: "path", focus: ".stop.current .node" }, check: (s) => Object.keys((s.path && s.path.completed) || {}).length > 0 },
    { id: "streak7", icon: "flame", title: "Check in 7 days in a row", how: "Open the app each day", xp: 100, check: (s) => s.profile.bestStreak >= 7 }
  ],


  /* ---------- 9b. WEEKLY QUESTS ----------
     Every Monday the app picks a few of these at random.
     progress(s, W) returns [how far you are, the target].
     W helps with dates:  W.has("2026-11-17") is true if that date is in this week,
     W.noSpendDays(s) counts days so far this week with no purchases. */
  weeklyPerWeek: 3,
  weeklyBonusXp: 50,        // extra XP for finishing all of a week's quests
  weeklySwapsPerWeek: 1,    // how many quests you can swap out each week
  weeklyQuests: [
    { id: "w_log5", icon: "receipt", title: "Log 5 transactions this week", xp: 40, go: { act: "addTx" },
      progress: (s, W) => [s.transactions.filter((t) => W.has(t.added)).length, 5] },
    { id: "w_goal50", icon: "piggy-bank", title: "Put $50 or more toward a goal", xp: 40, unit: "$", go: { page: "goals", act: "goalMoney" },
      progress: (s, W) => [Math.round(s.goals.reduce((a, g) => a + (g.history || []).filter((h) => W.has(h.date) && h.amount > 0).reduce((b, h) => b + h.amount, 0), 0)), 50] },
    { id: "w_lesson", icon: "graduation-cap", title: "Finish a lesson", xp: 30, go: { page: "learn", focus: ".next-lesson" },
      progress: (s, W) => [Object.values(s.profile.lessons).filter((d) => W.has(d)).length, 1] },
    { id: "w_checkin", icon: "flame", title: "Open the app 4 days this week", how: "Just come back and look around", xp: 40,
      progress: (s, W) => [(s.profile.checkins || []).filter((d) => W.has(d)).length, 4] },
    { id: "w_subs", icon: "repeat", title: "Review a subscription: keep it, lower it or cancel it", xp: 30, go: { page: "bills", focus: '[data-change="subStatus"]', fallback: "editSub" },
      progress: (s, W) => [s.subs.filter((x) => W.has(x.reviewed)).length, 1] },
    { id: "w_networth", icon: "scale", title: "Update your account balances", xp: 30, go: { page: "networth", focus: '[data-change="acctBal"]', fallback: "editAcct" },
      progress: (s, W) => [s.accounts.filter((a) => W.has(a.updated)).length, 1] },
    { id: "w_budget", icon: "wallet", title: "Adjust a budget to match real life", xp: 25, go: { page: "budgets", focus: '[data-change="catBudget"]' },
      progress: (s, W) => [s.categories.filter((c) => W.has(c.touchedOn)).length, 1] },
    { id: "w_reminder", icon: "bell", title: "Set a reminder for a bill or deadline", xp: 25, go: { page: "reminders", focus: 'form[data-form="addRem"] input[name="text"]' },
      progress: (s, W) => [s.reminders.filter((r) => W.has(r.created)).length, 1] },
    { id: "w_recat", icon: "sparkles", title: "Fix the category on 3 transactions", xp: 30, go: { page: "spending", focus: '[data-change="txCatInline"]', fallback: "addTx" },
      progress: (s, W) => [s.transactions.filter((t) => W.has(t.recatOn)).length, 3] },
    { id: "w_import", icon: "upload", title: "Import this week's bank file", xp: 50, go: { page: "spending", act: "toggleImport" },
      progress: (s, W) => [W.has(s.flags.importOn) ? 1 : 0, 1] },
    { id: "w_credit", icon: "credit-card", title: "Check and log your credit score", xp: 30, go: { page: "networth", focus: 'input[name="score"]' },
      progress: (s, W) => [s.credit.filter((c) => W.has(c.added)).length, 1] },
    { id: "w_nospend", icon: "leaf", title: "Have a no-spend day", how: "A whole day with no purchases. Log at least 3 things this week so it counts", xp: 40, go: { page: "spending" },
      progress: (s, W) => [W.noSpendDays(s) > 0 && s.transactions.filter((t) => W.has(t.added)).length >= 3 ? 1 : 0, 1] },
    { id: "w_tax", icon: "landmark", title: "Check your tax refund estimate", xp: 20, go: { page: "taxes", focus: '[data-bind="tax.withheldPerPay"]' },
      progress: (s, W) => [W.has((s.flags.visits || {}).taxes) ? 1 : 0, 1] },
    { id: "w_retire", icon: "sunset", title: "Try a what-if in the retirement calculator", xp: 20, go: { page: "retirement", focus: '[data-bind="retire.lump"]' },
      progress: (s, W) => [W.has(s.flags.retireOn) ? 1 : 0, 1] },
    { id: "w_save10", icon: "hand-coins", title: "Save 10% of what came in this week", how: "Log your paycheque, then a transfer to savings or a goal", xp: 50, unit: "%", go: { act: "addTx" },
      progress: (s, W) => {
        const inc = s.transactions.filter((t) => !t.example && t.kind === "income" && W.has(t.date)).reduce((a, t) => a + +t.amount, 0);
        const saveCats = s.categories.filter((c) => c.group === "save").map((c) => c.id);
        const saved = s.transactions.filter((t) => !t.example && t.kind === "expense" && saveCats.includes(t.cat) && W.has(t.date)).reduce((a, t) => a + +t.amount, 0)
          + s.goals.reduce((a, g) => a + (g.history || []).filter((h) => W.has(h.date) && h.amount > 0).reduce((b, h) => b + h.amount, 0), 0);
        return [inc > 0 ? Math.floor((saved / inc) * 100) : 0, 10];
      } }
  ],

  /* ---------- 10. BADGES ---------- */
  badges: [
    { id: "start", icon: "rocket", name: "Liftoff", desc: "Finished your first quest", color: "#7aa6d9", check: (s) => Object.keys(s.profile.quests).length >= 1 },
    { id: "streak3", icon: "flame", name: "Warming Up", desc: "3 day streak", color: "#eba277", check: (s) => s.profile.bestStreak >= 3 },
    { id: "streak30", icon: "flame", name: "On Fire", desc: "30 day streak", color: "#e08e8e", check: (s) => s.profile.bestStreak >= 30 },
    { id: "goal", icon: "medal", name: "Goal Getter", desc: "Hit 100% on a goal", color: "#e3b45f", check: (s) => s.goals.some((g) => !g.example && g.saved >= g.target && g.target > 0) },
    { id: "slayer", icon: "scissors", name: "Sub Slayer", desc: "Cancelled a subscription", color: "#9d94ea", check: (s) => s.subs.some((x) => x.status === "cancelled" && !x.example) },
    { id: "scholar", icon: "graduation-cap", name: "Scholar", desc: "Finished every lesson", color: "#6fb79a", check: (s, C) => Object.keys(s.profile.lessons).length >= C.lessons.length },
    { id: "positive", icon: "trending-up", name: "In the Green", desc: "Net worth above $0", color: "#5fae7c", check: (s, C) => { const mine = s.accounts.filter((a) => !a.example); return mine.length > 0 && mine.reduce((t, a) => t + ((C.accountTypes.find((x) => x.id === a.type) || {}).kind === "debt" ? -a.balance : +a.balance), 0) > 0; } },
    { id: "level5", icon: "crown", name: "Loonie Club", desc: "Reached level 5", color: "#d1a95a", check: (s, C, lvl) => lvl >= 5 },
    { id: "importer", icon: "upload", name: "Data Wizard", desc: "Imported a bank file", color: "#9aa3e3", check: (s) => s.flags.imported },
    { id: "weekly1", icon: "calendar", name: "Weekly Warrior", desc: "Finished all of a week's quests", color: "#5aa9a2", check: (s) => (s.profile.weeklyWins || 0) >= 1 },
    { id: "weekly3", icon: "gem", name: "Hat Trick", desc: "3 perfect weeks in a row", color: "#ab8fe6", check: (s) => (s.profile.bestWeeklyStreak || 0) >= 3 },
    { id: "path5", icon: "route", name: "Pathfinder", desc: "Finished 5 Piggy Quests", color: "#6cbab3", check: (s) => Object.keys((s.path && s.path.completed) || {}).length >= 5 },
    { id: "allQuests", icon: "trophy", name: "Completionist", desc: "Finished every quest", color: "#dd8fa4", check: (s, C) => Object.keys(s.profile.quests).length >= C.quests.length }
  ],


  /* ---------- 10b. MONEY PATH ----------
     The step-by-step checklist on the Piggy Quests page.
     Each step has items to tick. An item with auto(s, H) ticks itself
     when your numbers show it's done. H has handy numbers:
       H.needs          your monthly "need" budgets added up
       H.emergency      money in your emergency fund (goal or savings accounts)
       H.highDebt       what you owe on credit cards and lines of credit
       H.debtsListed    how many debts you've added on Net worth
       H.realTx         how many transactions you've logged
       H.has(type)      true if you've added that account type (like "tfsa")
     optional: true shows a "This doesn't apply to me" button.
     An item with bonus: true is extra credit: it shows a Bonus tag, gives XP,
     and the step still counts as done without it.
     go: where the "Go there" button takes you (same as quests). */
  moneyPath: [
    {
      id: "know", emoji: "🧭", color: "#7aa6d9", title: "See where your money goes",
      short: "No judging, just noticing. This is the most important step.",
      why: "You can't make a plan for money you can't see. Most people are surprised by at least one category, and that's a good thing. It's where the easy wins hide.",
      term: ["Budget", "A plan for your money before you spend it. Not a punishment, just a map."],
      items: [
        { id: "income", text: "Add your income", auto: (s) => s.tax.income > 0 && !s.isExample, go: { page: "taxes", focus: '[data-bind="tax.income"]' } },
        { id: "month", text: "Log or import about a month of spending", auto: (s, H) => H.realTx >= 15, go: { page: "spending", act: "toggleImport" } },
        { id: "budget", text: "Set a budget for your main categories", auto: (s) => s.categories.filter((c) => c.touched).length >= 4, go: { page: "budgets", focus: '[data-change="catBudget"]' } }
      ]
    },
    {
      id: "mini", emoji: "🛟", color: "#6cbab3", title: "Build a mini safety net: $1,000",
      short: "A small cushion so surprises don't land on a credit card.",
      why: "Paying off debt is hard if every flat tire goes back on the card. $1,000 is enough to stop that cycle. You'll build the full fund later.",
      term: ["HISA", "High-interest savings account. A savings account that pays you more interest. Keep this money separate from chequing so it's not tempting."],
      items: [
        { id: "open", text: "Open a high-interest savings account (HISA)", auto: (s, H) => H.has("savings") },
        { id: "k", text: "Save your first $1,000", auto: (s, H) => H.emergency >= 1000, go: { page: "goals", act: "editGoal" } }
      ]
    },
    {
      id: "match", emoji: "🎁", color: "#e3b45f", title: "Grab any free money from work", optional: true,
      short: "If your job matches RRSP or pension contributions, take all of it.",
      why: "A match is your employer adding money when you do. Often 50 cents to $1 for every dollar you put in. That's an instant 50% to 100% return. Nothing else comes close.",
      term: ["Employer match", "Extra money your job adds to your retirement savings when you contribute."],
      items: [
        { id: "ask", text: "Ask HR or check your benefits site: is there a match?" },
        { id: "full", text: "Contribute enough to get the full match" }
      ]
    },
    {
      id: "debt", emoji: "💳", color: "#e08e8e", title: "Pay off credit cards and high-interest debt",
      short: "Cards charge around 20% a year. Clearing them is a guaranteed win.",
      why: "Paying off a 20% card is like earning 20% on your money, guaranteed. It's normal to have card debt, and every payment above the minimum makes the next month lighter.",
      term: ["Interest", "What it costs to borrow. 20% a year on $3,000 is about $600 a year just for having the debt."],
      tip: "Two ways to do it: pay the highest interest first (saves the most), or the smallest balance first (quick wins feel great). Pick the one you'll stick with.",
      items: [
        { id: "list", text: "List every debt on the Net worth page", auto: (s, H) => H.debtsListed > 0, go: { page: "networth", act: "editAcct" } },
        { id: "extra", text: "Pay more than the minimum on one debt this month" },
        { id: "zero", text: "Credit cards and lines of credit paid to $0", auto: (s, H) => H.debtsListed > 0 && H.highDebt === 0 }
      ]
    },
    {
      id: "full", emoji: "🏡", color: "#6fb79a", title: "Grow your safety net: 3 months, 6 months, 1 year",
      short: "Start with 3 months of your safety net (needs plus most wants). Then 6. Then a whole year if you like!",
      why: "This is what turns money stress into money calm. Job change, health thing, family emergency: you're covered. Start with 3 months. Six is extra peace of mind.",
      term: ["Emergency fund", "Money only for real surprises. Not trips, not sales. It's your 'I've got this' fund."],
      items: [
        { id: "needs", text: "Know your monthly needs (rent, food, bills)", auto: (s, H) => H.needs > 0, go: { page: "budgets" } },
        { id: "three", text: "Save 3 months of your safety net", auto: (s, H) => (H.efMonthly || H.needs) > 0 && H.emergency >= (H.efMonthly || H.needs) * 3, go: { page: "goals" } },
        // bonus: true = nice to have. It doesn't hold up the step, and ticking it gives extra XP
        { id: "six", bonus: true, text: "Save 6 months of your safety net", auto: (s, H) => (H.efMonthly || H.needs) > 0 && H.emergency >= (H.efMonthly || H.needs) * 6, go: { page: "goals" } },
        { id: "year", bonus: true, text: "Save a whole year of your safety net", auto: (s, H) => (H.efMonthly || H.needs) > 0 && H.emergency >= (H.efMonthly || H.needs) * 12, go: { page: "goals" } }
      ]
    },
    {
      id: "fhsa", emoji: "🔑", color: "#e39bbd", title: "Dreaming of a first home? Open an FHSA", optional: true,
      short: "Lowers your taxes now and comes out tax-free for your first home.",
      why: "It's the best deal in Canada for first-time buyers. Even opening it with $10 starts your room building, $8,000 a year up to $40,000.",
      term: ["FHSA", "First Home Savings Account. Tax break going in, tax-free coming out for your first home."],
      items: [
        { id: "open", text: "Open an FHSA (even with $10)", auto: (s, H) => H.has("fhsa") },
        { id: "add", text: "Put money in this year", auto: (s) => s.tax.fhsa > 0 && !s.isExample, go: { page: "taxes", focus: '[data-bind="tax.fhsa"]' } }
      ]
    },
    {
      id: "tfsa", emoji: "🌱", color: "#5fae7c", title: "Fill up your TFSA",
      short: "Your money grows here and is never taxed. Ever.",
      why: "Everything your TFSA earns is yours to keep, tax-free. You get $7,000 of new room every January, and unused room carries forward. You can take money out any time.",
      term: ["TFSA", "Tax-Free Savings Account. Despite the name, it can hold investments, not just cash."],
      items: [
        { id: "open", text: "Open a TFSA", auto: (s, H) => H.has("tfsa") },
        { id: "room", text: "Check your room in CRA My Account so you don't overfill it" },
        { id: "auto", text: "Set up an automatic deposit every payday" },
        { id: "invest", text: "Invest long-term money in it, not just cash" }
      ]
    },
    {
      id: "rrsp", emoji: "🌅", color: "#eba277", title: "Grow your RRSP",
      short: "Saves tax now, builds your retirement. Best when you earn more.",
      why: "Every dollar in your RRSP lowers your taxes this year, so you usually get a refund. It's most powerful once you earn over about $58,000. Put the refund back into your TFSA and it works twice.",
      term: ["RRSP", "Registered Retirement Savings Plan. Tax break now, you pay tax later when you take it out in retirement."],
      items: [
        { id: "try", text: "See what it does for you on the Retirement page", auto: (s) => !!s.flags.retire, go: { page: "retirement", focus: '[data-bind="retire.monthly"]' } },
        { id: "add", text: "Make an RRSP contribution", auto: (s) => s.tax.rrsp > 0 && !s.isExample, go: { page: "taxes", focus: '[data-bind="tax.rrsp"]' } },
        { id: "refund", text: "Put your tax refund to work (TFSA or goal)" }
      ]
    },
    {
      id: "invest", emoji: "📈", color: "#9aa3e3", title: "Invest the simple way",
      short: "One low-fee fund, money in every month, then leave it alone.",
      why: "You don't need to pick stocks. An all-in-one ETF owns thousands of companies in one click. Time does the heavy lifting.",
      term: ["ETF", "Exchange-traded fund. One fund that holds lots of investments, so you're spread out and safer."],
      tip: "Check the fee, called MER. Under 0.30% is great. A 2% fee can eat a third of your money over decades.",
      items: [
        { id: "learn", text: "Finish the 'Investing without the stress' lesson", auto: (s) => !!s.profile.lessons.invest, go: { page: "learn" } },
        { id: "pick", text: "Pick a simple all-in-one ETF with a low fee" },
        { id: "stay", text: "Promise yourself: no panic selling when markets dip 🤝" }
      ]
    },
    {
      id: "dream", emoji: "🎉", color: "#c59ad8", title: "Dream bigger",
      short: "Extra on low-interest debt, big goals, and a yearly check-in.",
      why: "You made it here! Now it's about choices: pay off OSAP or a car loan faster, save for travel or a wedding, or invest more. There's no wrong answer.",
      term: ["Net worth", "What you own minus what you owe. Watching it climb is very satisfying."],
      items: [
        { id: "goal", text: "Set a big fun goal on the Goals page", auto: (s) => s.goals.some((g) => !g.example), go: { page: "goals", act: "editGoal" } },
        { id: "review", text: "Put a yearly 'money check-in' reminder on your calendar", go: { page: "reminders", focus: 'form[data-form="addRem"] input[name="text"]' } }
      ]
    }
  ],
  pathStepXp: 75,
  pathBonusXp: 50,   // for ticking a bonus item (like 6 months or 1 year of savings)

  /* ---------- 10c. CHEERS ----------
     The pop-ups that celebrate you. [emoji, title, extra line]. Add as many as you like:
     one is picked at random each time. */
  cheers: {
    save: [["🐷", "Sow proud of you!", "That money is safe and snug in the piggy bank."], ["💖", "Oink-credible saving!", "Future you just did a happy little wiggle."], ["🌱", "Swine-sational!", "Your savings are sprouting."], ["💸", "You paid your future self!", "Every dollar saved is a gift to future you."], ["🌱", "Look at that grow!", "Small amounts add up faster than you think."], ["🐷", "Oink oink!", "Your piggy bank is very happy right now."], ["🙌", "That's how it's done!", ""], ["⭐", "Saver mode: on", "You're building real security."]],
    income: [["🐽", "Payday, snout-day!", "Want to tuck a little into savings first?"], ["💰", "Money in!", "Now give every dollar a job."], ["🎉", "Payday vibes!", "Want to move a little to savings first?"]],
    firstTx: [["✍️", "First one logged!", "Starting is the hardest part, and you just did it."]],
    track: [["🐽", "Oink! Logged it.", "Tracking is a seriously good habit."], ["👀", "Nice tracking!", "Knowing where money goes is a superpower."], ["📒", "Logged!", "You're building a great habit."], ["🧠", "Big brain move", "Awareness is how change starts."]],
    milestone: [["🐷", "Pig-ture perfect progress!", "Keep it up!"], ["🚀", "Milestone reached!", ""], ["🔥", "You're on a roll!", ""]],
    goalDone: [["🏆", "Hog wild! Goal complete!", "You set it, you saved it, you totally hogged the win."], ["🏆", "Goal complete!", "You set it, you saved it, you did it."]],
    cancel: [["✂️", "Snip snip, oink oink!", ""], ["✂️", "Snip snip!", ""], ["🥳", "Freed up some cash!", ""]],
    step: [["🐾", "Trotting along!", "Another Piggy Quest done!"], ["🗺️", "Step complete!", "One more Piggy Quest complete."], ["🥾", "Onward!", "You're making real progress."]],
    weekly: [["🌟", "Hog heaven! Perfect week!", "Every weekly quest, done."], ["🔥", "Perfect week!", "Every weekly quest, done."]],
    level: [["👑", "Level up, little piggy!", ""], ["👑", "Level up!", ""]],
    lesson: [["🎓", "Snout-standing!", "Top of the class."], ["🧠", "You got it!", "Knowledge unlocked."], ["📚", "Smart cookie!", ""]],
    badge: [["🏅", "New badge!", ""]]
  },
  cheerEmojis: {
    save: ["💸", "🪙", "💰", "✨", "🌱"], income: ["💰", "🪙", "✨"], goalDone: ["🏆", "🎉", "⭐", "🎊"],
    cancel: ["✂️", "💸", "✨"], step: ["🗺️", "⭐", "🎉", "🥾"], lesson: ["🧠", "✨", "📚"],
    default: ["🎉", "✨", "⭐", "🎊", "💫"]
  },


  /* ---------- 10d. MONEY CHECK-IN + FUN FACTS ----------
     A quick check-in with encouraging replies and real stats.
     The first question asks an age range (optional). Any question can add
     ageNote: { "u25": "...", "25-34": "...", ... } for a "People your age" line.
     Age keys: u25, 25-34, 35-44, 45-54, 55-64, 65+
     Each answer can tick Piggy Quests items (yesTicks) or skip a step (skipStep).
     Keep stats honest: put the source and year, and update them when newer data comes out.
     Last checked: November 2026. Statistics Canada's 2024 savings-account data is
     delayed to winter 2026/27, so 2023 is still the newest for those. */
  checkin: {
    xp: 50,
    ages: [["u25", "Under 25"], ["25-34", "25 to 34"], ["35-44", "35 to 44"], ["45-54", "45 to 54"], ["55-64", "55 to 64"], ["65+", "65 or older"]],
    questions: [
      { id: "age", type: "age", emoji: "👋", q: "First, roughly how old are you?", hint: "So we can compare you with people your age. Totally optional." },
      { id: "feel", neutral: true, emoji: "💭", q: "Does money ever stress you out?", yesLabel: "Yes, sometimes", noLabel: "Not really",
        yes: "You're with most people. In November 2026, 70% of Canadians said they don't feel financially secure. Feeling that way doesn't mean you're doing anything wrong. You're here, taking steps, and that's what counts. 💛",
        no: "Love that for you! In November 2026, 70% of Canadians said they don't feel financially secure, so you're in a calm minority. 🧘",
        source: "TD / Léger survey, November 2026",
        ageNote: { "u25": "79% of Gen Z Canadians said they don't feel financially secure. If you feel it too, you're in very good company.", "25-34": "76% of Millennials and 79% of Gen Z said they don't feel financially secure. It's the cost of living, not you.", "35-44": "76% of Millennials said they don't feel financially secure. It's the cost of living, not you." } },
      { id: "budget", emoji: "🧭", q: "Do you use a budget, app or spreadsheet to track your money?", noLabel: "Not yet",
        yes: "Amazing! About 70% of Canadians don't use any budgeting tool. You're in the 30% who do. 🚢",
        no: "Totally normal: about 70% of Canadians don't use one either. And 2 in 3 Canadians plan to cut spending in 2026, so lots of people are figuring this out right alongside you. You're already in a budgeting app!",
        source: "TD surveys, 2025 and January 2026",
        ageNote: { "u25": "Gen Z is leading the way: 77% use their bank's tools to track spending.", "25-34": "77% of Gen Z and 64% of Millennials use their bank's tools to track spending. Your generation is on it.", "35-44": "64% of Millennials use their bank's tools to track spending." },
        ageSource: "Canadian Bankers Association poll, 2026" },
      { id: "cards", emoji: "💳", q: "Do you pay off your credit card in full every month?", yesLabel: "Yes, or I don't have one", noLabel: "Not right now",
        yes: "Love that! You're dodging that 20% interest like a pro. 🙌 Fun trend: more Canadians are doing this every year. 55% paid off their everyday card spending in full in 2026, up from 48% in 2024.",
        no: "You are so not alone. In 2026, about 1 in 4 Canadians expect they can only make the minimum payment. Looking at it honestly already puts you ahead, and Step 4 of Piggy Quests breaks it into small, doable steps.",
        source: "NerdWallet Canada 2026 credit card report; Equifax Canada survey, August 2026", yesTicks: ["debt.list", "debt.extra", "debt.zero"],
        ageNote: { "u25": "Only 47% of Canadians under 55 expect to pay their card in full each month. If you do, you're ahead of more than half.", "25-34": "Only 47% of Canadians under 55 expect to pay their card in full each month. If you do, you're ahead of more than half.", "35-44": "Only 47% of Canadians under 55 expect to pay their card in full each month. If you do, you're ahead of more than half.", "45-54": "Only 47% of Canadians under 55 expect to pay their card in full each month. If you do, you're ahead of more than half.", "55-64": "About 69% of Canadians 55 and older expect to pay their card in full each month.", "65+": "About 69% of Canadians 55 and older expect to pay their card in full each month." },
        ageSource: "Equifax Canada survey, August 2026" },
      { id: "emergency", emoji: "🛟", q: "Do you have some emergency savings set aside for surprises?", noLabel: "Not yet",
        yes: "That's real security. About 1 in 3 Canadians have no emergency fund at all, so you're ahead of a lot of people. 😌",
        no: "About 1 in 3 Canadians are in exactly the same spot, so no shame at all. Start tiny: even $25 a paycheque adds up. Piggy Quests start with a $1,000 mini safety net.",
        source: "RBC Emergency Readiness Poll, April 2026", yesTicks: ["mini.open"],
        ageNote: { "u25": "30% of Gen Z have no emergency fund yet, and 56% say they feel too stretched to build one. If it feels hard, that's the economy, not you.", "25-34": "30% of Gen Z and Millennials have no emergency fund yet. Every dollar you add puts you further ahead.", "35-44": "30% of Millennials have no emergency fund yet. Every dollar you add puts you further ahead." } },
      { id: "tfsa", emoji: "🌱", q: "Did you put money in a TFSA (Tax-Free Savings Account) in the last year?", noLabel: "Not yet",
        yes: "Nice! Over 18 million Canadians have a TFSA, and you're actively growing yours. Bonus points if it's invested, not just sitting in cash. 🌱",
        no: "No worries! Opening one takes a few minutes at most banks. You'll join over 18 million Canadians growing money tax-free.",
        source: "OSFI summary of Statistics Canada data, 2023", yesTicks: ["tfsa.open"],
        ageNote: { "u25": "Only about 1 in 5 Canadians under 25 (19.8%) put money in a TFSA. Starting now gives you a huge head start.", "25-34": "About 1 in 3 people aged 25 to 34 (34.4%) put money in a TFSA.", "35-44": "About 1 in 3 people aged 35 to 44 (33.3%) put money in a TFSA.", "45-54": "About 35% of people aged 45 to 54 put money in a TFSA.", "55-64": "About 36% of people aged 55 to 64 put money in a TFSA.", "65+": "About 38% of Canadians 65 and older put money in a TFSA. It's the most popular account in your age group!" },
        ageSource: "Statistics Canada tax data, 2023 (newest available)" },
      { id: "rrsp", emoji: "🌅", q: "Did you put money in an RRSP in the last year or so?", noLabel: "Not yet",
        yes: "You're in a pretty exclusive club! Only about 1 in 5 Canadian tax filers (21%) put money in an RRSP. 🌅",
        no: "Most Canadians didn't either: about 4 in 5 tax filers skipped it. Once you earn over about $58,000 a year, it's a great way to cut your taxes.",
        source: "OSFI summary of Statistics Canada data, 2023", yesTicks: ["rrsp.add"],
        ageNote: { "u25": "Only 5.7% of under-25s put money in an RRSP. You'd be way ahead of your peers.", "25-34": "About 22% of people aged 25 to 34 put money in an RRSP.", "35-44": "About 31% of people aged 35 to 44 put money in an RRSP.", "45-54": "About 37% of people aged 45 to 54 put money in an RRSP. This is the peak age for it.", "55-64": "About 30% of people aged 55 to 64 put money in an RRSP.", "65+": "Only about 6% of people 65+ add to an RRSP. That's normal: this is when most people start using their savings." },
        ageSource: "Statistics Canada tax data, 2023 (newest available)" },
      { id: "fhsa", emoji: "🔑", q: "Have you opened an FHSA (First Home Savings Account)?", noLabel: "Not yet", skipLabel: "Not planning to buy a home",
        yes: "Early adopter alert! 🔑 About 739,000 Canadians opened one in its first year, and it keeps growing: there were about 834,000 FHSA tax claims for 2024.",
        no: "It's still pretty new, so most people haven't. Opening one, even with $10, starts your $8,000 a year of room building.",
        skip: "Totally valid! Renting is a great choice for lots of people. We'll skip that step in Piggy Quests.",
        source: "Canada Revenue Agency FHSA statistics (2023) and 2024 tax-year data", yesTicks: ["fhsa.open"], skipStep: "fhsa",
        ageNote: { "u25": "Only about 3% of under-25 tax filers put money in an FHSA. Opening early gives you the most time to grow it.", "25-34": "Your age group leads the way: most FHSA savers are 25 to 34, and 25 to 29 year olds made about 1 in 3 of all FHSA claims for 2024.", "35-44": "About 1.6% of people aged 35 to 44 put money in an FHSA. It's not too late if you've never owned a home." },
        ageSource: "Statistics Canada (2023) and CRA 2024 tax-year data" }
    ]
  },
  // [emoji, fact, source]. One shows on Home each day, with an "Another one" button.
  funFacts: [
    ["📈", "Canadians under 35 saw their typical net worth jump 179% from 2019 to 2023, after inflation. Young people are catching up.", "Statistics Canada, Survey of Financial Security 2023"],
    ["🐣", "Gen Z workers set aside about 11% of each paycheque, more than any other generation. Go Gen Z!", "National Payroll Institute and Western University, 2025"],
    ["💳", "More Canadians are paying off their everyday credit card spending in full: 55% in 2026, up from 48% in 2024.", "NerdWallet Canada, 2026"],
    ["✂️", "2 in 3 Canadians plan to cut spending in 2026. If you're tightening up, you're very much not alone.", "TD survey, January 2026"],
    ["📱", "77% of Gen Z and 64% of Millennials use their bank's tools to track spending.", "Canadian Bankers Association, 2026"],
    ["🌱", "Over 18 million Canadians have a TFSA. That's a lot of people growing money tax-free.", "OSFI / Statistics Canada, 2023"],
    ["👵", "The TFSA is the most popular savings account for Canadians 65+: 38% put money in one.", "Statistics Canada, 2023"],
    ["🔑", "Most people saving in an FHSA are 25 to 34. First homes are still a big dream for young Canadians.", "Statistics Canada, 2023"],
    ["🇺🇸", "South of the border, 63% of Americans could cover a surprise $400 bill with cash. Every dollar in your safety net counts.", "U.S. Federal Reserve, May 2026"],
    ["🪙", "Canada stopped making pennies in 2013. That's why the first level here, Penny Starter, is a little retro.", ""],
    ["📈", "$200 a month at 6% for 35 years grows to about $285,000. You'd only put in $84,000. Time does the heavy lifting.", ""],
    ["🧠", "Checking your own credit score never lowers it. Peek as often as you like.", ""],
    ["🎁", "Lots of Canadian benefits, like the GST/HST credit, only arrive if you file your taxes, even with low or no income.", "Canada Revenue Agency"]
  ],
  /* ---------- 11. LESSONS ----------
     body is simple HTML. quiz.answer is the position of the right option, starting at 0. */
  lessons: [
    {
      id: "budget", icon: "wallet", color: "#7aa6d9", title: "Budgeting in 3 buckets", mins: 2,
      body: "<p>A budget is just a plan for your money before you spend it. The easiest one is <b>50/30/20</b>.</p><ul><li><b>50% needs:</b> rent, groceries, TTC, phone. Stuff you can't skip.</li><li><b>30% wants:</b> eating out, shopping, concerts.</li><li><b>20% savings:</b> emergency fund, TFSA, RRSP, paying off debt.</li></ul><p>In Toronto, rent alone can eat 40% or more. That's normal. Just trim wants to make room for savings.</p>",
      quiz: { q: "Which bucket does a Netflix subscription go in?", options: ["Needs", "Wants", "Savings"], answer: 1, explain: "Nice to have, not something you need to live. That makes it a want." }
    },
    {
      id: "emergency", icon: "umbrella", color: "#6cbab3", title: "Your emergency fund", mins: 2,
      body: "<p>An emergency fund is money you keep for surprises: losing a job, a vet bill, a broken phone.</p><p>Start with <b>$1,000</b>. Then build to <b>3 to 6 months of needs</b>. Keep it in a high-interest savings account (HISA) or a TFSA in cash, where you can get it fast.</p><p>Without one, every surprise goes on a credit card at about 20% interest.</p>",
      quiz: { q: "Where should your emergency fund live?", options: ["In stocks", "Somewhere safe you can reach fast", "In your RRSP"], answer: 1, explain: "Stocks can drop right when you need them, and RRSP withdrawals get taxed." }
    },
    {
      id: "tfsa", icon: "piggy-bank", color: "#6fb79a", title: "TFSA: the tax-free account", mins: 3,
      body: "<p>A <b>Tax-Free Savings Account</b> is a box you put money in. Whatever it earns inside is <b>never taxed</b>, even when you take it out.</p><ul><li>You get <b>$7,000</b> of new room every January (2026).</li><li>Unused room adds up forever. If you were 18 in 2009, you have about <b>$109,000</b> total.</li><li>Take money out any time. You get that room back next January.</li></ul><p>Big mistake to avoid: a TFSA isn't just a savings account. You can hold ETFs and stocks in it too, and that's where it really grows.</p><p>Second mistake: putting more in than your room allows. The CRA charges 1% a month on the extra. Check your room in CRA My Account.</p>",
      quiz: { q: "You take $2,000 out of your TFSA in March. When do you get that room back?", options: ["Right away", "Next January 1", "Never"], answer: 1, explain: "Withdrawals are added back to your room on January 1 of the next year." }
    },
    {
      id: "rrsp", icon: "sunset", color: "#eba277", title: "RRSP: get a tax refund now", mins: 3,
      body: "<p>A <b>Registered Retirement Savings Plan</b> lowers your taxable income. Put in $1,000 and the government acts like you earned $1,000 less.</p><p>That's why RRSPs create <b>tax refunds</b>. At $70,000 a year in Ontario, $1,000 in your RRSP gets you about <b>$300</b> back.</p><ul><li>Room: 18% of last year's income, up to $33,810 for 2026.</li><li>Deadline: about 60 days into the next year (early March).</li><li>Catch: you pay tax when you take it out in retirement. So it's best when your income is higher now than it will be later.</li></ul>",
      quiz: { q: "Why does an RRSP give you a tax refund?", options: ["It's a gift from the bank", "It lowers the income you pay tax on", "It's free money that never gets taxed"], answer: 1, explain: "Contributions are deducted from your income. You'll pay tax later when you withdraw." }
    },
    {
      id: "which", icon: "scale", color: "#9aa3e3", title: "TFSA or RRSP first?", mins: 2,
      body: "<p>Simple rule of thumb:</p><ul><li><b>Earning under about $58,000?</b> TFSA first. Your tax rate is low, so the RRSP refund is small.</li><li><b>Earning over about $58,000?</b> RRSP gets more useful, especially if you put the refund into your TFSA.</li><li><b>Work has an RRSP match?</b> Always take it first. It's free money.</li><li><b>Want to buy a first home?</b> FHSA beats both. See the next lesson.</li></ul>",
      quiz: { q: "Your employer matches RRSP contributions. What do you do first?", options: ["Ignore it", "Take the full match", "Only use a TFSA"], answer: 1, explain: "A match is an instant 50% to 100% return. Nothing else beats that." }
    },
    {
      id: "fhsa", icon: "key-round", color: "#e39bbd", title: "FHSA: the first home superpower", mins: 3,
      body: "<p>The <b>First Home Savings Account</b> mixes the best parts of the RRSP and TFSA:</p><ul><li>Money going in <b>lowers your taxes</b>, like an RRSP.</li><li>Money coming out for your first home is <b>tax-free</b>, like a TFSA.</li><li>$8,000 a year, $40,000 total. Unused room carries forward one year (max $16,000 in one year).</li><li>If you never buy, move it to your RRSP without using RRSP room.</li></ul><p>You can open one if you haven't owned a home you lived in during this year or the last 4 years. Open it early, even with $10. Your room only starts counting once it's open.</p>",
      quiz: { q: "When does your FHSA room start building?", options: ["When you turn 18", "When you open the account", "When you buy a house"], answer: 1, explain: "Room starts the year you open it. Opening early, even with a tiny amount, starts the clock." }
    },
    {
      id: "brackets", icon: "landmark", color: "#8aa3b0", title: "How tax brackets really work", mins: 2,
      body: "<p>Myth: \"If I get a raise I'll jump a bracket and take home less.\" <b>Not true.</b></p><p>Canada uses <b>marginal tax</b>. Only the dollars <i>inside</i> each bracket get that bracket's rate. Going over a line only changes the tax on the extra dollars.</p><p>In Ontario you pay federal tax and Ontario tax together. On income around $60,000, your next dollar is taxed about <b>30%</b>. Your <i>average</i> income tax rate is much lower, around 14%.</p>",
      quiz: { q: "You get a $2,000 raise that crosses a bracket line. What happens?", options: ["All your income gets taxed more", "Only the dollars over the line are taxed higher", "You take home less"], answer: 1, explain: "Marginal tax means only the new dollars above the line pay the higher rate." }
    },
    {
      id: "paystub", icon: "receipt", color: "#e3b45f", title: "Your paycheque, decoded", mins: 2,
      body: "<p>Four main things come off your pay:</p><ul><li><b>Income tax:</b> federal + Ontario, held back so you don't owe a lump in April.</li><li><b>CPP:</b> Canada Pension Plan. It's your future pension, not a loss.</li><li><b>EI:</b> Employment Insurance. Pays you if you lose your job or go on parental leave.</li><li><b>Benefits/RRSP:</b> anything you signed up for at work.</li></ul><p>If you get a big refund every year, too much is being held back. You can ask for less to be withheld with form T1213.</p>",
      quiz: { q: "What is CPP?", options: ["A fee you never see again", "A pension you collect later", "A bank account"], answer: 1, explain: "CPP builds a pension you start getting between ages 60 and 70." }
    },
    {
      id: "credit", icon: "credit-card", color: "#dd8fa4", title: "Credit scores in Canada", mins: 2,
      body: "<p>Your credit score is a number from <b>300 to 900</b> that tells lenders how safe you are. Equifax and TransUnion track it. Many bank apps show it free.</p><ul><li><b>Pay on time.</b> Biggest factor by far. Set up autopay for the minimum.</li><li><b>Use under 30%</b> of your limit. On a $5,000 card, keep the balance under $1,500.</li><li><b>Keep old cards open.</b> Long history helps.</li><li>Checking your own score <b>never</b> hurts it.</li></ul><p>760+ is excellent. 660 to 724 is good. Under 560 makes renting and borrowing hard.</p>",
      quiz: { q: "Does checking your own credit score lower it?", options: ["Yes", "No"], answer: 1, explain: "Checking your own score is a \"soft\" check. It never affects your score." }
    },
    {
      id: "benefits", icon: "hand-coins", color: "#5fae7c", title: "Free money: just file your taxes", mins: 2,
      body: "<p>Lots of Canadian money only shows up if you <b>file a tax return</b>, even with low or zero income:</p><ul><li><b>GST/HST credit:</b> paid every 3 months (Jan, Apr, Jul, Oct).</li><li><b>Ontario Trillium Benefit:</b> includes help for rent and energy costs. Paid monthly. Keep your rent receipts and enter rent paid when you file.</li><li><b>Canada Workers Benefit:</b> for people working on a lower income.</li><li><b>Canada Child Benefit:</b> monthly if you have kids under 18.</li></ul><p>Students and people with low income can often file for free through the CRA's free tax clinics.</p>",
      quiz: { q: "How do you get the GST/HST credit?", options: ["Apply at a bank", "File your tax return", "It's only for business owners"], answer: 1, explain: "The CRA works it out automatically from your tax return." }
    },
    {
      id: "invest", icon: "trending-up", color: "#6cbab3", title: "Investing without the stress", mins: 3,
      body: "<p>You don't need to pick stocks. Most people do great with <b>index funds or all-in-one ETFs</b>: one fund that owns thousands of companies.</p><ul><li><b>Compounding:</b> your growth earns growth. $200 a month at 6% for 35 years is about $285,000. You only put in $84,000.</li><li><b>Fees matter:</b> a 2% fee can eat a third of your money over decades. Look for MER under 0.30%.</li><li><b>Don't panic sell.</b> Markets drop sometimes. Time in the market wins.</li></ul>",
      quiz: { q: "Over 30 years, which hurts more?", options: ["A 2% yearly fee", "A 0.2% yearly fee", "They're the same"], answer: 0, explain: "Fees compound too. 2% a year can take a huge share of your final balance." }
    },
    {
      id: "debt", icon: "flame", color: "#e08e8e", title: "Crushing debt", mins: 2,
      body: "<p>Credit cards in Canada charge around <b>20% to 23%</b> a year. Paying one off is like earning that return, guaranteed.</p><ul><li><b>Avalanche:</b> pay minimums on everything, put extra on the highest interest rate. Saves the most money.</li><li><b>Snowball:</b> put extra on the smallest balance first. Quick wins keep you going.</li></ul><p>Pick the one you'll stick with. OSAP loans have no interest on the federal part, so pay off cards first.</p>",
      quiz: { q: "Which debt should usually go first?", options: ["The one with the highest interest rate", "OSAP", "The oldest one"], answer: 0, explain: "High interest costs the most, so killing it first saves the most money." }
    }
  ],

  /* ---------- 12. CALENDAR ----------
     [month, day, text]. Dates that land on a weekend are shown as is. */
  calendar: [
    [1, 1, "New TFSA room unlocks today ($7,000 for 2026)"],
    [1, 5, "GST/HST credit payment arrives around today"],
    [2, 1, "Tax slips (T4, T5) start arriving. Start a folder"],
    [3, 1, "RRSP deadline for last year (it's the 60th day of the year, check the exact date)"],
    [3, 15, "Tax instalment due (only if the CRA sent you a reminder)"],
    [4, 5, "GST/HST credit payment arrives around today"],
    [4, 30, "Tax filing deadline. File even with low income to get your benefits"],
    [6, 15, "Self-employed filing deadline (money owed was still due April 30)"],
    [7, 5, "GST/HST credit payment arrives around today"],
    [9, 1, "Back to school. Review your budget after summer"],
    [10, 5, "GST/HST credit payment arrives around today"],
    [11, 1, "Plan RRSP and FHSA top-ups before year end"],
    [12, 1, "Set a holiday gift budget before the sales hit"],
    [12, 31, "Last day for FHSA contributions to count this year"]
  ],

  /* ---------- 13. CANCEL + NEGOTIATE ---------- */
  cancelSteps: [
    "Log in to the service's website or app and look for Account, Membership or Billing.",
    "Look for Cancel, Turn off auto-renew, or Downgrade. It's often hidden at the bottom.",
    "If you can't find it, check the app store: iPhone Settings, your name, Subscriptions. Android: Play Store, profile, Payments & subscriptions.",
    "Still stuck? Phone or chat with them and say: \"I'd like to cancel today. Please confirm by email.\"",
    "Screenshot the confirmation. Check your next statement to make sure the charge stopped.",
    "Charged after cancelling? Your bank or credit card can dispute it."
  ],
  negotiateScript:
`Hi, I've been a customer for [how long] and I'm reviewing my bills.
I'm paying $[amount] a month for [plan]. I've seen offers from [Freedom / Public Mobile / Virgin / another provider] for about $[their price].
I'd like to stay, but I need a better price or I'll switch.
What can you do for me today?

If they say no: "Could you transfer me to the loyalty or retention department?"
If they offer something: "Is that the best you can do?" Then ask how long the new price lasts.`
};
