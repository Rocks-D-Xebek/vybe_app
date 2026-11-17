// Built-in food database (common Indian foods). Values are per 100 g of the food as usually eaten
// (cooked / prepared), approximated from IFCT 2017 and USDA references. Units map to grams.
// Anything not here is looked up by Mr. Vyb (backend food_info) and cached on the phone.

export interface Per100g { kcal: number; p: number; c: number; f: number; fib: number; sug: number; na: number }
export interface Food {
  id: string; name: string; aliases: string[]; per100: Per100g;
  units: Record<string, number>; defaultUnit: string; defaultQty: number; custom?: boolean;
}

export const UNIT_LABEL: Record<string, string> = {
  piece: 'Piece', katori: 'Katori', bowl: 'Bowl', plate: 'Plate', cup: 'Cup', glass: 'Glass', tbsp: 'Tbsp', tsp: 'Tsp',
  slice: 'Slice', handful: 'Handful', pack: 'Pack', scoop: 'Scoop', can: 'Can', serving: 'Serving', g: 'Grams', oz: 'Ounce', ml: 'ml',
};

const BASE: Record<string, Record<string, number>> = {
  curry: { katori: 150, bowl: 250, cup: 200, tbsp: 15 },
  rice: { katori: 120, bowl: 200, plate: 300, cup: 160 },
  drink: { cup: 150, glass: 250 },
  fruit: { cup: 150, bowl: 200 },
  snack: { handful: 30, plate: 100 },
  none: {},
};

type N = [number, number, number, number, number, number, number]; // kcal, protein, carbs, fat, fibre, sugar, sodium(mg)
const F = (name: string, aliases: string, base: keyof typeof BASE, n: N, extra: Record<string, number>, def: string, qty = 1): Food => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name, aliases: aliases ? aliases.split('|') : [],
  per100: { kcal: n[0], p: n[1], c: n[2], f: n[3], fib: n[4], sug: n[5], na: n[6] },
  units: { ...BASE[base], ...extra }, defaultUnit: def, defaultQty: qty,
});

export const FOODS: Food[] = [
  // Rice & grains
  F('Rice (white, cooked)', 'rice|chawal|annam|steamed rice', 'rice', [130, 2.7, 28, 0.3, 0.4, 0.1, 1], {}, 'katori'),
  F('Brown rice', 'brown rice', 'rice', [112, 2.3, 24, 0.8, 1.8, 0.4, 5], {}, 'katori'),
  F('Jeera rice', 'jeera rice|cumin rice', 'rice', [160, 3, 28, 4, 0.6, 0.2, 200], {}, 'katori'),
  F('Curd rice', 'curd rice|thayir sadam|daddojanam', 'rice', [120, 3.5, 17, 4, 0.3, 2, 180], {}, 'katori'),
  F('Lemon rice', 'lemon rice|chitranna|pulihora', 'rice', [170, 3, 28, 5, 1, 0.5, 250], {}, 'katori'),
  F('Veg pulao', 'pulao|pulav|veg pulav', 'rice', [150, 3.5, 24, 4.5, 1.5, 1, 300], {}, 'katori'),
  F('Chicken biryani', 'biryani|chicken biriyani|hyderabadi biryani', 'rice', [180, 9, 22, 6.5, 1, 1, 400], { plate: 350 }, 'plate'),
  F('Mutton biryani', 'mutton biriyani|gosht biryani', 'rice', [200, 10, 21, 9, 1, 1, 420], { plate: 350 }, 'plate'),
  F('Veg biryani', 'veg biriyani|vegetable biryani', 'rice', [160, 3.5, 25, 5, 1.8, 1.5, 350], { plate: 350 }, 'plate'),
  F('Egg biryani', 'egg biriyani|anda biryani', 'rice', [175, 7, 23, 6, 1, 1, 380], { plate: 350 }, 'plate'),
  F('Khichdi', 'khichdi|khichri|kichdi', 'rice', [120, 4.5, 19, 3, 2, 0.5, 250], {}, 'bowl'),
  F('Veg fried rice', 'fried rice|veg fried rice', 'rice', [165, 3.5, 27, 5, 1.2, 1, 450], {}, 'plate'),
  F('Chicken fried rice', 'chicken fried rice', 'rice', [180, 7, 25, 6, 1, 1, 480], {}, 'plate'),
  F('Sabudana khichdi', 'sabudana|sago khichdi', 'rice', [180, 2, 30, 6, 1, 1, 200], {}, 'katori'),
  // Breads
  F('Roti / chapati', 'roti|chapati|phulka|chapathi|rotli', 'none', [250, 8.5, 47, 3.5, 7, 1, 280], { piece: 40 }, 'piece', 2),
  F('Naan', 'naan|plain naan', 'none', [300, 9, 50, 7, 2, 3, 450], { piece: 90 }, 'piece'),
  F('Butter naan', 'butter naan', 'none', [330, 8.5, 48, 11, 2, 3, 480], { piece: 100 }, 'piece'),
  F('Garlic naan', 'garlic naan', 'none', [320, 9, 48, 10, 2, 3, 470], { piece: 100 }, 'piece'),
  F('Kulcha', 'kulcha|amritsari kulcha', 'none', [300, 8, 48, 8, 2, 3, 450], { piece: 90 }, 'piece'),
  F('Plain paratha', 'paratha|parotta|lachha paratha', 'none', [320, 7, 45, 13, 4, 1, 350], { piece: 80 }, 'piece'),
  F('Aloo paratha', 'aloo paratha|potato paratha', 'none', [250, 5, 35, 10, 3, 1, 380], { piece: 120 }, 'piece'),
  F('Puri', 'puri|poori', 'none', [380, 6, 42, 21, 3, 1, 300], { piece: 25 }, 'piece', 3),
  F('Thepla', 'thepla|methi thepla', 'none', [300, 8, 40, 12, 5, 1, 350], { piece: 40 }, 'piece', 2),
  F('Bread (white)', 'bread|white bread', 'none', [265, 9, 49, 3.2, 2.7, 5, 490], { slice: 30 }, 'slice', 2),
  F('Brown bread', 'brown bread|wheat bread|multigrain bread', 'none', [250, 10, 43, 3.5, 6, 5, 450], { slice: 30 }, 'slice', 2),
  F('Pav', 'pav|bun|ladi pav', 'none', [280, 9, 50, 4.5, 2.5, 4, 450], { piece: 40 }, 'piece', 2),
  // South Indian breakfast
  F('Idli', 'idli|idly', 'none', [130, 4, 26, 0.5, 1.5, 0.3, 250], { piece: 45 }, 'piece', 2),
  F('Plain dosa', 'dosa|dosai|plain dosa|sada dosa', 'none', [170, 4, 28, 4.5, 1.5, 0.5, 300], { piece: 90 }, 'piece'),
  F('Masala dosa', 'masala dosa', 'none', [165, 3.5, 26, 5.5, 2, 1, 320], { piece: 180 }, 'piece'),
  F('Medu vada', 'vada|vadai|medu vada|garelu', 'none', [300, 9, 28, 17, 5, 1, 400], { piece: 50 }, 'piece', 2),
  F('Uttapam', 'uttapam|uthappam|oothappam', 'none', [160, 4, 27, 4, 2, 1, 300], { piece: 120 }, 'piece'),
  F('Appam', 'appam|palappam', 'none', [120, 2.5, 24, 1.5, 1, 1, 150], { piece: 60 }, 'piece', 2),
  F('Pesarattu', 'pesarattu|moong dosa', 'none', [150, 7, 22, 4, 4, 1, 250], { piece: 100 }, 'piece'),
  F('Upma', 'upma|uppittu|rava upma', 'rice', [140, 3.5, 21, 4.5, 2, 1, 350], {}, 'katori'),
  F('Poha', 'poha|aval|atukulu|pohe', 'rice', [130, 2.5, 24, 3, 1.5, 1, 300], {}, 'katori'),
  F('Pongal', 'pongal|ven pongal', 'rice', [140, 4, 20, 5, 1.5, 0.5, 250], {}, 'katori'),
  F('Puttu', 'puttu', 'rice', [160, 3.5, 33, 1.5, 2.5, 0.5, 100], {}, 'cup'),
  F('Coconut chutney', 'chutney|coconut chutney', 'curry', [190, 2.5, 8, 17, 4, 2, 250], {}, 'tbsp', 2),
  // Dals & curries
  F('Sambar', 'sambar|sambhar|saaru', 'curry', [65, 3, 9, 2, 2.5, 2, 300], {}, 'katori'),
  F('Rasam', 'rasam|chaaru', 'curry', [30, 1, 5, 0.8, 0.8, 1, 400], {}, 'katori'),
  F('Dal tadka', 'dal|daal|dal fry|dal tadka|pappu|paruppu', 'curry', [110, 6, 14, 3.5, 4, 1, 300], {}, 'katori'),
  F('Dal makhani', 'dal makhani|maa ki dal', 'curry', [140, 6, 14, 7, 4, 1.5, 350], {}, 'katori'),
  F('Moong dal', 'moong dal|yellow dal', 'curry', [100, 7, 14, 2, 4, 1, 280], {}, 'katori'),
  F('Rajma', 'rajma|kidney beans', 'curry', [120, 6, 17, 3, 5, 1.5, 300], {}, 'katori'),
  F('Chole', 'chole|chana masala|chickpea curry', 'curry', [150, 7, 20, 5, 6, 2, 330], {}, 'katori'),
  F('Paneer butter masala', 'paneer butter masala|paneer makhani|butter paneer', 'curry', [220, 9, 9, 17, 1.5, 4, 420], {}, 'katori'),
  F('Palak paneer', 'palak paneer|saag paneer', 'curry', [150, 7, 6, 11, 2, 2, 350], {}, 'katori'),
  F('Kadai paneer', 'kadai paneer|kadhai paneer|paneer masala', 'curry', [190, 9, 8, 14, 2, 3, 400], {}, 'katori'),
  F('Paneer tikka', 'paneer tikka', 'none', [220, 16, 6, 15, 1, 2, 350], { piece: 25, plate: 200 }, 'piece', 6),
  F('Mixed veg curry', 'mix veg|mixed vegetable|veg curry|sabzi', 'curry', [90, 2.5, 9, 5, 3, 3, 300], {}, 'katori'),
  F('Aloo gobi', 'aloo gobi', 'curry', [100, 2, 11, 5.5, 3, 2, 300], {}, 'katori'),
  F('Bhindi fry', 'bhindi|okra|bendakaya|vendakkai', 'curry', [120, 2.5, 9, 8, 4, 2, 300], {}, 'katori'),
  F('Aloo sabzi', 'aloo|potato curry|aloo sabzi|batata bhaji', 'curry', [110, 2, 15, 5, 2, 1, 300], {}, 'katori'),
  F('Baingan bharta', 'baingan|brinjal|eggplant', 'curry', [100, 2, 8, 7, 3.5, 4, 300], {}, 'katori'),
  F('Kadhi', 'kadhi|kadi|majjiga pulusu', 'curry', [90, 3, 8, 5, 0.5, 2, 350], {}, 'katori'),
  // Non-veg
  F('Chicken curry', 'chicken curry|chicken gravy|kozhi curry', 'curry', [150, 14, 4, 9, 0.8, 1.5, 400], {}, 'katori'),
  F('Butter chicken', 'butter chicken|murgh makhani', 'curry', [200, 13, 6, 14, 0.7, 3, 450], {}, 'katori'),
  F('Chicken 65', 'chicken 65|chicken fry', 'none', [260, 20, 10, 16, 0.5, 1, 600], { piece: 25, plate: 200 }, 'plate'),
  F('Tandoori chicken', 'tandoori chicken', 'none', [165, 25, 3, 6, 0.5, 1, 500], { piece: 150 }, 'piece'),
  F('Chicken tikka', 'chicken tikka', 'none', [150, 25, 2, 5, 0.5, 1, 450], { piece: 30, plate: 200 }, 'piece', 6),
  F('Grilled chicken breast', 'chicken breast|grilled chicken', 'none', [165, 31, 0, 3.6, 0, 0, 70], { piece: 150 }, 'piece'),
  F('Mutton curry', 'mutton curry|goat curry|gosht', 'curry', [190, 16, 4, 12, 0.5, 1, 420], {}, 'katori'),
  F('Mutton keema', 'keema|kheema', 'curry', [220, 17, 5, 15, 1, 1, 450], {}, 'katori'),
  F('Fish curry', 'fish curry|meen curry|machher jhol', 'curry', [130, 14, 4, 6.5, 0.5, 1, 400], {}, 'katori'),
  F('Fish fry', 'fish fry|fried fish', 'none', [220, 20, 6, 13, 0.5, 0.5, 450], { piece: 80 }, 'piece', 2),
  F('Prawn curry', 'prawn|shrimp|royyala', 'curry', [120, 14, 4, 5.5, 0.5, 1, 450], {}, 'katori'),
  F('Egg curry', 'egg curry|anda curry', 'curry', [150, 8, 5, 11, 1, 2, 380], {}, 'katori'),
  F('Boiled egg', 'egg|boiled egg|anda|ande', 'none', [155, 13, 1.1, 11, 0, 1.1, 124], { piece: 50 }, 'piece', 2),
  F('Egg white', 'egg white', 'none', [52, 11, 0.7, 0.2, 0, 0.7, 166], { piece: 33 }, 'piece', 2),
  F('Omelette', 'omelette|omelet|amlet', 'none', [154, 11, 1, 12, 0, 1, 300], { piece: 120 }, 'piece'),
  F('Egg bhurji', 'egg bhurji|scrambled egg', 'curry', [180, 11, 3, 14, 0.5, 1, 350], {}, 'katori'),
  F('Haleem', 'haleem', 'curry', [175, 10, 12, 9, 2, 1, 400], {}, 'bowl'),
  F('Chicken shawarma', 'shawarma|chicken roll|kathi roll', 'none', [230, 13, 24, 9, 2, 3, 550], { piece: 250 }, 'piece'),
  // Dairy & drinks
  F('Paneer', 'paneer|cottage cheese', 'none', [265, 18, 3.5, 20, 0, 3, 30], { piece: 25, cup: 120 }, 'g', 100),
  F('Curd / dahi', 'curd|dahi|yogurt|perugu|thayir', 'curry', [61, 3.5, 4.7, 3.3, 0, 4.7, 46], {}, 'katori'),
  F('Raita', 'raita', 'curry', [70, 3, 6, 3.5, 0.5, 4, 250], {}, 'katori'),
  F('Milk', 'milk|doodh|toned milk', 'drink', [58, 3.2, 4.8, 3, 0, 4.8, 44], {}, 'glass'),
  F('Chai (with sugar)', 'tea|chai|cutting chai|masala chai', 'drink', [45, 1.5, 7, 1.3, 0, 6.5, 20], { cup: 120 }, 'cup'),
  F('Coffee (with milk & sugar)', 'coffee|filter coffee|cappuccino', 'drink', [50, 1.7, 7, 1.6, 0, 6.5, 25], { cup: 150 }, 'cup'),
  F('Black coffee', 'black coffee|americano', 'drink', [2, 0.3, 0, 0, 0, 0, 5], {}, 'cup'),
  F('Buttermilk', 'buttermilk|chaas|majjiga|mor', 'drink', [25, 1.5, 2.5, 0.8, 0, 2.5, 250], {}, 'glass'),
  F('Sweet lassi', 'lassi|sweet lassi', 'drink', [90, 3, 14, 2.5, 0, 13, 50], {}, 'glass'),
  F('Fresh lime soda', 'lime soda|nimbu pani|lemonade', 'drink', [40, 0.1, 10, 0, 0, 9.5, 150], {}, 'glass'),
  F('Orange juice', 'juice|orange juice|fruit juice', 'drink', [45, 0.7, 10.4, 0.2, 0.2, 8.4, 1], {}, 'glass'),
  F('Coconut water', 'coconut water|tender coconut|elaneer', 'drink', [19, 0.7, 3.7, 0.2, 1.1, 2.6, 105], { piece: 300 }, 'glass'),
  F('Soft drink (cola)', 'coke|pepsi|cola|soft drink|thums up|sprite', 'drink', [42, 0, 10.6, 0, 0, 10.6, 4], { can: 330 }, 'can'),
  F('Protein shake (whey)', 'whey|protein shake|protein powder', 'none', [380, 75, 8, 5, 1, 4, 200], { scoop: 32 }, 'scoop'),
  // Fruit
  F('Banana', 'banana|kela|arati pandu', 'fruit', [89, 1.1, 23, 0.3, 2.6, 12, 1], { piece: 120 }, 'piece'),
  F('Apple', 'apple|seb', 'fruit', [52, 0.3, 14, 0.2, 2.4, 10, 1], { piece: 180 }, 'piece'),
  F('Mango', 'mango|aam|mamidi', 'fruit', [60, 0.8, 15, 0.4, 1.6, 14, 1], { piece: 200 }, 'piece'),
  F('Orange', 'orange|santra|kamala', 'fruit', [47, 0.9, 12, 0.1, 2.4, 9, 0], { piece: 150 }, 'piece'),
  F('Papaya', 'papaya|papita', 'fruit', [43, 0.5, 11, 0.3, 1.7, 8, 8], {}, 'bowl'),
  F('Watermelon', 'watermelon|tarbooz', 'fruit', [30, 0.6, 7.6, 0.2, 0.4, 6, 1], { slice: 280 }, 'bowl'),
  F('Grapes', 'grapes|angoor', 'fruit', [69, 0.7, 18, 0.2, 0.9, 15, 2], {}, 'cup'),
  F('Guava', 'guava|amrood|jama', 'fruit', [68, 2.6, 14, 1, 5.4, 9, 2], { piece: 100 }, 'piece'),
  F('Pomegranate', 'pomegranate|anar|danimma', 'fruit', [83, 1.7, 19, 1.2, 4, 14, 3], { piece: 250 }, 'cup'),
  F('Fruit salad', 'fruit salad|fruit bowl', 'fruit', [55, 0.7, 14, 0.2, 2, 11, 3], {}, 'bowl'),
  // Snacks & street food
  F('Samosa', 'samosa', 'snack', [260, 5, 30, 14, 3, 2, 420], { piece: 60 }, 'piece'),
  F('Pakora / bajji', 'pakora|pakoda|bajji|bhajji|bhaji|mirchi bajji', 'snack', [300, 6, 30, 17, 3, 2, 400], { piece: 30 }, 'piece', 4),
  F('Vada pav', 'vada pav|wada pav', 'none', [290, 6, 40, 12, 3, 3, 500], { piece: 150 }, 'piece'),
  F('Pav bhaji', 'pav bhaji', 'none', [180, 4, 25, 7, 3, 4, 450], { plate: 300 }, 'plate'),
  F('Misal pav', 'misal|misal pav', 'none', [200, 7, 24, 9, 5, 3, 500], { plate: 300 }, 'plate'),
  F('Pani puri', 'pani puri|golgappa|puchka|gupchup', 'none', [180, 3.5, 28, 6, 2, 3, 400], { piece: 15, plate: 90 }, 'piece', 6),
  F('Bhel puri', 'bhel|bhel puri|churumuri', 'snack', [190, 4, 30, 6, 3, 4, 400], { plate: 150 }, 'plate'),
  F('Chakodi', 'chakodi|chekodi|chakodilu', 'snack', [520, 8, 55, 30, 4, 1, 600], { piece: 3 }, 'handful'),
  F('Murukku', 'murukku|chakli|janthikalu', 'snack', [520, 8, 55, 30, 4, 1, 600], { piece: 15 }, 'piece', 3),
  F('Mixture / namkeen', 'mixture|namkeen|chivda|bhujia|sev', 'snack', [540, 13, 43, 35, 6, 3, 800], { pack: 40 }, 'handful'),
  F('Potato chips', 'chips|potato chips|wafers|lays|chilli potato chips', 'snack', [536, 7, 53, 34, 4.4, 0.5, 525], { pack: 52 }, 'pack'),
  F('Marie biscuits', 'biscuit|biscuits|marie|parle g|glucose biscuit', 'none', [440, 7, 75, 12, 2, 20, 380], { piece: 7, pack: 70 }, 'piece', 4),
  F('Cream biscuits', 'cream biscuit|bourbon|oreo', 'none', [480, 5, 70, 20, 2, 38, 300], { piece: 12, pack: 100 }, 'piece', 3),
  F('Dhokla', 'dhokla|khaman', 'none', [160, 6, 23, 5, 2, 4, 400], { piece: 30 }, 'piece', 4),
  F('Veg momos', 'momos|veg momos|dumplings', 'none', [160, 5, 26, 4, 2, 1, 400], { piece: 25, plate: 150 }, 'plate'),
  F('Chicken momos', 'chicken momos', 'none', [180, 9, 22, 6, 1.5, 1, 450], { piece: 25, plate: 150 }, 'plate'),
  F('Maggi / instant noodles', 'maggi|noodles|instant noodles|yippee', 'none', [135, 3, 19, 5.5, 1, 1, 600], { pack: 230 }, 'pack'),
  F('Hakka noodles', 'hakka noodles|chowmein|chow mein', 'rice', [170, 4, 27, 5.5, 1.5, 2, 500], {}, 'plate'),
  F('Veg sandwich', 'sandwich|veg sandwich|grilled sandwich', 'none', [200, 6, 28, 7, 3, 4, 450], { piece: 150 }, 'piece'),
  F('Pizza', 'pizza|cheese pizza', 'none', [266, 11, 33, 10, 2.3, 3.6, 600], { slice: 100 }, 'slice', 2),
  F('Veg burger', 'burger|veg burger|aloo tikki burger', 'none', [250, 7, 33, 10, 3, 6, 500], { piece: 150 }, 'piece'),
  F('Chicken burger', 'chicken burger', 'none', [260, 13, 26, 11, 1.5, 5, 550], { piece: 170 }, 'piece'),
  F('French fries', 'fries|french fries', 'none', [312, 3.4, 41, 15, 3.8, 0.3, 210], { pack: 115 }, 'pack'),
  F('Sweet corn', 'corn|sweet corn|bhutta', 'fruit', [96, 3.4, 21, 1.5, 2.4, 4.5, 15], { piece: 150 }, 'cup'),
  F('Sprouts salad', 'sprouts|moong sprouts|sprout salad', 'curry', [70, 5, 12, 0.5, 4, 2, 100], {}, 'katori'),
  F('Green salad', 'salad|green salad|cucumber salad', 'curry', [20, 1, 4, 0.2, 2, 2, 20], {}, 'bowl'),
  F('Tomato soup', 'soup|tomato soup', 'curry', [50, 1.2, 8, 1.5, 1, 5, 400], {}, 'bowl'),
  // Breakfast cereals & spreads
  F('Oats (with milk)', 'oats|oatmeal|porridge', 'curry', [90, 4, 13, 2.5, 1.6, 4, 50], {}, 'bowl'),
  F('Cornflakes (dry)', 'cornflakes|cereal|chocos', 'none', [357, 8, 84, 0.4, 3, 9, 700], { cup: 30, bowl: 40 }, 'bowl'),
  F('Peanut butter', 'peanut butter', 'none', [588, 25, 20, 50, 6, 9, 430], { tbsp: 16 }, 'tbsp', 2),
  F('Butter', 'butter|amul butter', 'none', [717, 0.9, 0.1, 81, 0, 0.1, 640], { tsp: 5, tbsp: 14 }, 'tsp'),
  F('Ghee', 'ghee|neyyi', 'none', [900, 0, 0, 100, 0, 0, 0], { tsp: 5, tbsp: 14 }, 'tsp'),
  F('Sugar', 'sugar|chini', 'none', [387, 0, 100, 0, 0, 100, 1], { tsp: 4 }, 'tsp'),
  F('Jam', 'jam', 'none', [278, 0.4, 69, 0.1, 1, 49, 30], { tbsp: 20 }, 'tbsp'),
  // Nuts
  F('Almonds', 'almonds|badam', 'snack', [579, 21, 22, 50, 12.5, 4.4, 1], { piece: 1.2 }, 'piece', 8),
  F('Cashews', 'cashew|kaju', 'snack', [553, 18, 30, 44, 3.3, 6, 12], { piece: 1.5 }, 'piece', 8),
  F('Peanuts (roasted)', 'peanuts|groundnuts|moongphali|palli', 'snack', [585, 24, 21, 50, 8, 4, 6], {}, 'handful'),
  F('Peanut chikki', 'chikki', 'none', [500, 13, 55, 26, 4, 40, 50], { piece: 25 }, 'piece'),
  // Sweets
  F('Gulab jamun', 'gulab jamun', 'none', [330, 5, 50, 12, 0.5, 38, 60], { piece: 40 }, 'piece', 2),
  F('Jalebi', 'jalebi|jilebi', 'none', [400, 3, 60, 17, 0.5, 45, 20], { piece: 30 }, 'piece', 2),
  F('Rasgulla', 'rasgulla|rasagola', 'none', [186, 4, 38, 1.5, 0, 35, 30], { piece: 50 }, 'piece', 2),
  F('Besan laddu', 'laddu|ladoo|besan laddu|motichoor', 'none', [470, 8, 55, 25, 3, 38, 40], { piece: 40 }, 'piece'),
  F('Kheer / payasam', 'kheer|payasam|payesh', 'curry', [140, 4, 21, 4.5, 0.3, 16, 50], {}, 'katori'),
  F('Ice cream', 'ice cream|kulfi', 'none', [207, 3.5, 24, 11, 0.7, 21, 80], { scoop: 70, cup: 100 }, 'scoop', 2),
  F('Milk chocolate', 'chocolate|dairy milk|kitkat', 'none', [535, 7.6, 59, 30, 3.4, 51, 80], { piece: 10, pack: 40 }, 'pack'),
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Best matches for a search term (name, then aliases, then partial words). */
export function searchFoods(query: string, extra: Food[] = [], limit = 12): Food[] {
  const q = norm(query);
  if (!q) return [];
  const all = [...extra, ...FOODS];
  const scored = all.map(f => {
    const names = [norm(f.name), ...f.aliases.map(norm)];
    let score = 0;
    for (const n of names) {
      if (n === q) score = Math.max(score, 100);
      else if (n.startsWith(q)) score = Math.max(score, 80);
      else if (n.split(' ').some(w => w.startsWith(q))) score = Math.max(score, 60);
      else if (n.includes(q)) score = Math.max(score, 40);
      else if (q.split(' ').every(w => n.includes(w))) score = Math.max(score, 30);
    }
    return { f, score };
  }).filter(x => x.score > 0);
  scored.sort((a, b) => b.score - a.score || a.f.name.length - b.f.name.length);
  const seen = new Set<string>();
  return scored.filter(x => (seen.has(x.f.id) ? false : (seen.add(x.f.id), true))).slice(0, limit).map(x => x.f);
}

/** Exact-ish single best match, used when the user types a comma-separated list. */
export function bestMatch(term: string, extra: Food[] = []): Food | null {
  const r = searchFoods(term, extra, 1)[0];
  if (!r) return null;
  const q = norm(term);
  const names = [norm(r.name), ...r.aliases.map(norm)];
  return names.some(n => n === q || n.startsWith(q) || q.startsWith(n) || q.includes(n)) ? r : null;
}

/** Grams for a quantity of a unit (grams/ounce always available). */
export function gramsFor(food: Food, unit: string, qty: number) {
  if (unit === 'g' || unit === 'ml') return qty;
  if (unit === 'oz') return qty * 28.35;
  return (food.units[unit] ?? 100) * qty;
}

export function nutritionFor(food: Food, unit: string, qty: number) {
  const k = gramsFor(food, unit, qty) / 100;
  const n = food.per100;
  return { calories: n.kcal * k, proteinG: n.p * k, carbsG: n.c * k, fatG: n.f * k, fiberG: n.fib * k, sugarG: n.sug * k, sodiumMg: n.na * k };
}

export function unitsOf(food: Food): string[] {
  return [...Object.keys(food.units), 'g', 'oz'];
}

/** Step for the roller: 0.5 for household units, 10 for grams/ml, 0.5 for ounces. */
export function stepFor(unit: string) {
  return unit === 'g' || unit === 'ml' ? 10 : 0.5;
}
