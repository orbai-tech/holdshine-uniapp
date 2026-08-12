function money(n) {
  return Number(n).toFixed(2)
}

export const stores = [
  {
    store_id: '1',
    store_code: 'SH-JA',
    store_name: '上海静安嘉里中心店',
    store_type: 1,
    status: 1,
    contact_name: null,
    mobile: null,
    logo_path: null,
    cover_path: null,
    province: '上海',
    city: '上海',
    district: '静安区',
    address: '南京西路 1515 号',
    longitude: '121.4450',
    latitude: '31.2235',
    business_hours: '08:30 – 21:30',
    enable_dine_in: 1,
    enable_takeaway: 1,
    enable_mall: 0,
    enable_points: 1,
    min_order_amount: null,
    packing_fee: '0.00',
    delivery_fee: '0.00',
    free_delivery_amount: null,
    delivery_radius_km: null,
    dine_prep_minutes: 8,
    takeaway_prep_minutes: 8,
  },
  {
    store_id: '2',
    store_code: 'SH-XH',
    store_name: '上海徐汇天钥桥店',
    store_type: 1,
    status: 1,
    contact_name: null,
    mobile: null,
    logo_path: null,
    cover_path: null,
    province: '上海',
    city: '上海',
    district: '徐汇区',
    address: '天钥桥路 333 号',
    longitude: '121.4370',
    latitude: '31.1850',
    business_hours: '08:00 – 21:00',
    enable_dine_in: 1,
    enable_takeaway: 1,
    enable_mall: 0,
    enable_points: 1,
    min_order_amount: null,
    packing_fee: '0.00',
    delivery_fee: '0.00',
    free_delivery_amount: null,
    delivery_radius_km: null,
    dine_prep_minutes: 10,
    takeaway_prep_minutes: 12,
  },
]

const RAW = [
  { product_id: 1, category_id: 1, category_name: '咖啡', product_name: '经典拿铁', short_description: '埃塞浓缩 × 鲜牛乳', cover: '/static/images/products/latte.jpg', base_price: 26, tags: '门店招牌', is_recommended: 1 },
  { product_id: 2, category_id: 1, category_name: '咖啡', product_name: '冰美式', short_description: '双份浓缩，清爽干净', cover: '/static/images/products/americano.jpg', base_price: 22, tags: null, is_recommended: 0 },
  { product_id: 3, category_id: 1, category_name: '咖啡', product_name: '手冲 · 耶加雪菲', short_description: '水洗浅烘，柑橘与茉莉', cover: '/static/images/products/pourover.jpg', base_price: 32, tags: '限量豆单', is_recommended: 1 },
  { product_id: 4, category_id: 1, category_name: '咖啡', product_name: '黑芝麻燕麦拿铁', short_description: '现磨黑芝麻酱 × 燕麦奶', cover: '/static/images/products/sesame.jpg', base_price: 28, tags: '人气新品', is_recommended: 1 },
  { product_id: 5, category_id: 2, category_name: '滋补', product_name: '冰糖燕窝饮', short_description: '每日鲜炖，45g 足料', cover: '/static/images/products/birdsnest.jpg', base_price: 48, tags: '每日鲜炖', is_recommended: 1 },
  { product_id: 6, category_id: 2, category_name: '滋补', product_name: '桂圆红枣茶', short_description: '慢煮 40 分钟', cover: '/static/images/products/longan.jpg', base_price: 26, tags: null, is_recommended: 0 },
  { product_id: 7, category_id: 2, category_name: '滋补', product_name: '枸杞菊花茶', short_description: '宁夏头茬枸杞 × 杭白菊', cover: '/static/images/products/goji.jpg', base_price: 22, tags: null, is_recommended: 0 },
  { product_id: 8, category_id: 2, category_name: '滋补', product_name: '古法黑芝麻糊', short_description: '石磨细研，现点现冲', cover: '/static/images/products/sesame-paste.jpg', base_price: 24, tags: null, is_recommended: 0 },
  { product_id: 9, category_id: 3, category_name: '零售', product_name: '即炖燕窝礼盒 6 盏', short_description: '溯源干燕窝，附炖盅', cover: '/static/images/products/giftbox.jpg', base_price: 399, tags: '节礼甄选', is_recommended: 0 },
  { product_id: 10, category_id: 3, category_name: '零售', product_name: '每日坚果 30 日装', short_description: '核桃、巴旦木、腰果', cover: '/static/images/products/nuts.jpg', base_price: 39, tags: null, is_recommended: 0 },
  { product_id: 11, category_id: 3, category_name: '零售', product_name: '挂耳咖啡 10 入', short_description: '门店同款拼配', cover: '/static/images/products/dripbag.jpg', base_price: 59, tags: null, is_recommended: 0 },
  { product_id: 12, category_id: 3, category_name: '零售', product_name: '枸杞原浆 7 支装', short_description: '冷榨锁鲜，0 添加蔗糖', cover: '/static/images/products/goji-juice.jpg', base_price: 69, tags: null, is_recommended: 0 },
]

function optionGroups(productId) {
  return [
    {
      group_id: productId * 10 + 1,
      group_code: 'temp',
      group_name: '温度',
      select_type: 1,
      is_required: 1,
      values: [
        { option_id: productId * 100 + 1, option_name: '热', price_delta: '0.00', is_default: 1 },
        { option_id: productId * 100 + 2, option_name: '正常冰', price_delta: '0.00', is_default: 0 },
        { option_id: productId * 100 + 3, option_name: '少冰', price_delta: '0.00', is_default: 0 },
      ],
    },
    {
      group_id: productId * 10 + 2,
      group_code: 'extra',
      group_name: '加料',
      select_type: 2,
      is_required: 0,
      values: [
        { option_id: productId * 100 + 11, option_name: '加燕窝 15g', price_delta: '8.00', is_default: 0 },
        { option_id: productId * 100 + 12, option_name: '加浓缩 1 份', price_delta: '3.00', is_default: 0 },
        { option_id: productId * 100 + 13, option_name: '换燕麦奶', price_delta: '3.00', is_default: 0 },
        { option_id: productId * 100 + 14, option_name: '加核桃碎', price_delta: '3.00', is_default: 0 },
      ],
    },
  ]
}

export const products = RAW.map((item) => ({
  product_id: item.product_id,
  product_name: item.product_name,
  short_description: item.short_description,
  cover_image_path: item.cover,
  base_price: money(item.base_price),
  drink_kind: null,
  caffeine_level: null,
  tags: item.tags,
  is_recommended: item.is_recommended,
  category_id: item.category_id,
  category_name: item.category_name,
  skus: [
    { sku_id: item.product_id * 10 + 1, sku_name: '中杯', cup_size: 'M', sale_price: money(item.base_price) },
    { sku_id: item.product_id * 10 + 2, sku_name: '大杯', cup_size: 'L', sale_price: money(item.base_price + 3) },
  ],
  option_groups: optionGroups(item.product_id),
}))

export function findStore(storeId) {
  return stores.find((item) => item.store_id === String(storeId)) || null
}

export function findProduct(productId) {
  return products.find((item) => item.product_id === Number(productId)) || null
}

export function buildMenu(storeId) {
  const store = findStore(storeId)
  if (!store) return null
  const groups = new Map()
  for (const item of products) {
    let group = groups.get(item.category_id)
    if (!group) {
      group = { category_id: item.category_id, category_name: item.category_name, products: [] }
      groups.set(item.category_id, group)
    }
    const { category_id, category_name, ...product } = item
    group.products.push(product)
  }
  return {
    store_id: Number(store.store_id),
    store_name: store.store_name,
    categories: [...groups.values()],
  }
}

export { money }
