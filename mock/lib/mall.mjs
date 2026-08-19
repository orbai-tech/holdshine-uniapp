import { stores } from './fixtures.mjs'

function money(n) {
  return Number(n).toFixed(2)
}

/** 礼品目录（按门店复用同一批 mock 货架）。 */
const PRODUCTS = [
  {
    product_id: '101',
    category_id: 'c1',
    category_name: '节礼',
    product_name: '即炖燕窝礼盒 6 盏',
    subtitle: 'NEST GIFT',
    short_description: '溯源干燕窝，附炖盅',
    badge_text: '节礼甄选',
    cover_image_path: '/static/images/products/giftbox.jpg',
    base_price: money(399),
    market_price: money(468),
    unit_name: '盒',
    sold_count: 28,
    available_qty: 40,
    low_stock_qty: 5,
    show_low_stock: false,
    price_from: false,
    description:
      '精选溯源干燕窝，六盏独立包装，附陶瓷炖盅。适合探望与节庆礼赠，冷藏保存，开盖即炖。',
    image_paths: [
      '/static/images/products/giftbox.jpg',
      '/static/images/products/birdsnest.jpg',
    ],
    need_shipping: 1,
    ship_within_hours: 48,
    free_shipping: 0,
    limit_per_order: 3,
    skus: [
      {
        sku_id: '1011',
        sku_name: '经典礼盒',
        sale_price: money(399),
        available_qty: 40,
      },
    ],
  },
  {
    product_id: '102',
    category_id: 'c1',
    category_name: '节礼',
    product_name: '挂耳咖啡 10 入',
    subtitle: 'DRIP BAG',
    short_description: '门店同款拼配',
    badge_text: null,
    cover_image_path: '/static/images/products/dripbag.jpg',
    base_price: money(59),
    market_price: money(72),
    unit_name: '盒',
    sold_count: 120,
    available_qty: 200,
    low_stock_qty: 10,
    show_low_stock: false,
    price_from: false,
    description: '门店同款拼配豆，挂耳滤泡，热水冲泡即可。十入独立包装，随身便携。',
    image_paths: ['/static/images/products/dripbag.jpg'],
    need_shipping: 1,
    ship_within_hours: 24,
    free_shipping: 1,
    limit_per_order: 10,
    skus: [
      {
        sku_id: '1021',
        sku_name: '标准装',
        sale_price: money(59),
        available_qty: 200,
      },
    ],
  },
  {
    product_id: '103',
    category_id: 'c2',
    category_name: '滋养',
    product_name: '每日坚果 30 日装',
    subtitle: 'DAILY NUTS',
    short_description: '核桃、巴旦木、腰果',
    badge_text: null,
    cover_image_path: '/static/images/products/nuts.jpg',
    base_price: money(39),
    market_price: null,
    unit_name: '袋',
    sold_count: 86,
    available_qty: 8,
    low_stock_qty: 10,
    show_low_stock: true,
    price_from: false,
    description: '每日一份混合坚果，核桃、巴旦木与腰果，无添加糖。适合办公与居家加餐。',
    image_paths: ['/static/images/products/nuts.jpg'],
    need_shipping: 1,
    ship_within_hours: 48,
    free_shipping: 0,
    limit_per_order: 5,
    skus: [
      {
        sku_id: '1031',
        sku_name: '30 日装',
        sale_price: money(39),
        available_qty: 8,
      },
    ],
  },
  {
    product_id: '104',
    category_id: 'c2',
    category_name: '滋养',
    product_name: '枸杞原浆 7 支装',
    subtitle: 'GOJI PUREE',
    short_description: '冷榨锁鲜，0 添加蔗糖',
    badge_text: '冷榨',
    cover_image_path: '/static/images/products/goji-juice.jpg',
    base_price: money(69),
    market_price: money(88),
    unit_name: '盒',
    sold_count: 54,
    available_qty: 60,
    low_stock_qty: 8,
    show_low_stock: false,
    price_from: false,
    description: '宁夏头茬枸杞冷榨成浆，七支独立包装，开盖即饮，无添加蔗糖。',
    image_paths: [
      '/static/images/products/goji-juice.jpg',
      '/static/images/products/goji.jpg',
    ],
    need_shipping: 1,
    ship_within_hours: 48,
    free_shipping: 0,
    limit_per_order: 4,
    skus: [
      {
        sku_id: '1041',
        sku_name: '7 支装',
        sale_price: money(69),
        available_qty: 60,
      },
    ],
  },
]

function resolveStore(storeIdRaw) {
  const id = storeIdRaw == null || storeIdRaw === '' ? null : String(storeIdRaw)
  if (id) {
    const found = stores.find((s) => String(s.store_id) === id)
    if (found) return found
  }
  return stores[0]
}

function toCard(product) {
  return {
    product_id: product.product_id,
    product_name: product.product_name,
    subtitle: product.subtitle,
    short_description: product.short_description,
    badge_text: product.badge_text,
    cover_image_path: product.cover_image_path,
    base_price: product.base_price,
    market_price: product.market_price,
    member_price: null,
    member_discount_rate: null,
    member_discount_label: null,
    unit_name: product.unit_name,
    sold_count: product.sold_count,
    available_qty: product.available_qty,
    low_stock_qty: product.low_stock_qty,
    show_low_stock: product.show_low_stock,
    price_from: product.price_from,
    skus: product.skus,
  }
}

function toDetail(product) {
  return {
    ...toCard(product),
    description: product.description,
    image_paths: product.image_paths,
    need_shipping: product.need_shipping,
    ship_within_hours: product.ship_within_hours,
    free_shipping: product.free_shipping,
    limit_per_order: product.limit_per_order,
  }
}

/** GET /api/mp/customer/mall → MallCatalogRes */
export function getMallCatalog(storeIdRaw) {
  const store = resolveStore(storeIdRaw)
  const byCat = new Map()
  for (const product of PRODUCTS) {
    if (!byCat.has(product.category_id)) {
      byCat.set(product.category_id, {
        category_id: product.category_id,
        category_name: product.category_name,
        products: [],
      })
    }
    byCat.get(product.category_id).products.push(toCard(product))
  }
  return {
    store_id: String(store.store_id),
    store_name: store.store_name,
    slogan: '滋补食材 · 精品咖啡零售',
    mall_free_shipping_amount: money(199),
    mall_default_freight: money(12),
    mall_ship_within_hours: 48,
    mall_courier: '顺丰速运',
    mall_support_pickup: 0,
    categories: [...byCat.values()],
  }
}

/** GET /api/mp/customer/mall/products/{id} → MallProductDetailRes */
export function getMallProduct(productIdRaw, storeIdRaw) {
  resolveStore(storeIdRaw)
  const id = String(productIdRaw)
  const product = PRODUCTS.find((item) => item.product_id === id)
  if (!product) {
    const err = new Error('商品不存在')
    err.code = 40400
    throw err
  }
  return toDetail(product)
}
