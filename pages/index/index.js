const STORAGE_KEY = 'inventory-system-data-v2'
const APP_VERSION = '最新版 2026-05-29'
const CHANNEL_TYPES = [
  { key: 'normal', label: '普通渠道商' },
  { key: 'brand3w', label: '3W品牌渠道商' },
  { key: 'taizhouYiwen', label: '台州伊文渠道商' }
]

const RECORD_TITLES = {
  outbound: '出库记录',
  inbound: '入库记录',
  returnInbound: '退货入库记录'
}

const DEFAULT_DATA = {
  categories: ['3W品牌', '台州伊文', '普通商品', '未分类'],
  products: [
    { id: 'product-1', name: '3W品牌洗护套装', spec: '500ml×2', category: '3W品牌', stock: 120, price: 89, warningLine: 30 },
    { id: 'product-2', name: '伊文精品礼盒', spec: '礼盒装', category: '台州伊文', stock: 18, price: 168, warningLine: 20 }
  ],
  channels: [
    { id: 'channel-1', name: '普通渠道 A', type: 'normal', balance: 5600 },
    { id: 'channel-2', name: '3W 直营网点', type: 'brand3w', balance: 12800 },
    { id: 'channel-3', name: '台州伊文代理', type: 'taizhouYiwen', balance: 9300 }
  ],
  records: [
    { id: 'record-1', type: 'inbound', date: '2026-05-01', productName: '3W品牌洗护套装', spec: '500ml×2', supplier: '杭州供应商', quantity: 40, unitPrice: 82, amount: 3280, remark: '期初入库' },
    { id: 'record-2', type: 'outbound', date: '2026-05-05', productName: '伊文精品礼盒', spec: '礼盒装', quantity: 6, unitPrice: 168, amount: 1008 },
    { id: 'record-3', type: 'returnInbound', date: '2026-05-07', orderNo: 'TH20260507001', logisticsCompany: '顺丰速运', logisticsNo: 'SF1234567890', productName: '3W品牌洗护套装', spec: '500ml×2', quantity: 3, operator: '张三', unitPrice: 89, amount: 267, remark: '客户退货' }
  ]
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data))
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value) {
  return toNumber(value).toFixed(2)
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function pad(num) {
  return String(num).padStart(2, '0')
}

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function monthStart(dateText) {
  return `${dateText.slice(0, 7)}-01`
}

function isDateInRange(dateText, startDate, endDate) {
  if (!dateText) return false
  if (startDate && dateText < startDate) return false
  if (endDate && dateText > endDate) return false
  return true
}

function getChannelLabel(type) {
  const channelType = CHANNEL_TYPES.find((item) => item.key === type)
  return channelType ? channelType.label : type
}

Page({
  data: {
    tabs: [
      { key: 'dashboard', label: '仪表盘' },
      { key: 'inventory', label: '库存数量' },
      { key: 'outbound', label: '出库记录' },
      { key: 'inbound', label: '入库记录' },
      { key: 'returnInbound', label: '退货入库记录' },
      { key: 'channels', label: '渠道商款项' }
    ],
    activeTab: 'dashboard',
    appVersion: APP_VERSION,
    currentDate: formatDate(new Date()),
    categories: [],
    products: [],
    channels: [],
    records: [],
    dashboard: {},
    channelSummaries: [],
    warningProducts: [],
    visibleRecords: [],
    productSpecs: [],
    categoryNames: [],
    selectedCategoryName: '',
    selectedChannelTypeLabel: CHANNEL_TYPES[0].label,
    channelTypeLabels: CHANNEL_TYPES.map((item) => item.label),
    recordTitle: '',
    editingProductId: '',
    productForm: {
      name: '',
      spec: '',
      categoryIndex: 0,
      stock: '',
      price: '',
      warningLine: '10'
    },
    channelForm: {
      name: '',
      typeIndex: 0,
      balance: ''
    },
    inboundForm: {
      date: formatDate(new Date()),
      productName: '',
      supplier: '',
      quantity: '',
      unitPrice: '',
      remark: ''
    },
    outboundForm: {
      date: formatDate(new Date()),
      productName: '',
      spec: '',
      quantity: ''
    },
    returnForm: {
      date: formatDate(new Date()),
      orderNo: '',
      logisticsCompany: '',
      logisticsNo: '',
      productName: '',
      spec: '',
      quantity: '',
      operator: '',
      remark: ''
    },
    recordFilter: {
      startDate: monthStart(formatDate(new Date())),
      endDate: formatDate(new Date())
    }
  },

  onLoad() {
    const cached = wx.getStorageSync(STORAGE_KEY)
    const source = cached && cached.products ? cached : cloneData(DEFAULT_DATA)
    this.setData(source, () => this.refreshView())
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.key }, () => this.refreshView())
  },

  refreshView() {
    const today = this.data.currentDate
    const currentMonthStart = monthStart(today)
    const products = this.data.products.map((product) => ({
      ...product,
      amount: money(toNumber(product.stock) * toNumber(product.price)),
      price: money(product.price)
    }))
    const channels = this.data.channels.map((channel) => ({
      ...channel,
      typeLabel: getChannelLabel(channel.type),
      balance: money(channel.balance)
    }))
    const warningProducts = products.filter((product) => toNumber(product.stock) <= toNumber(product.warningLine))
    const channelSummaries = CHANNEL_TYPES.map((channelType) => {
      const scoped = this.data.channels.filter((channel) => channel.type === channelType.key)
      return {
        type: channelType.key,
        label: channelType.label,
        count: scoped.length,
        amount: money(scoped.reduce((sum, channel) => sum + toNumber(channel.balance), 0))
      }
    })
    const records = this.data.records.map((record) => ({
      ...record,
      amount: money(record.amount),
      unitPrice: record.unitPrice === undefined ? '' : money(record.unitPrice)
    }))
    const todayInbound = this.sumRecordsByDate('inbound', today, today)
    const todayOutbound = this.sumRecordsByDate('outbound', today, today)
    const monthInbound = this.sumRecordsByDate('inbound', currentMonthStart, today)
    const monthOutbound = this.sumRecordsByDate('outbound', currentMonthStart, today)
    const totalAmount = this.data.products.reduce((sum, product) => sum + toNumber(product.stock) * toNumber(product.price), 0)
    const channelTotal = this.data.channels.reduce((sum, channel) => sum + toNumber(channel.balance), 0)

    this.setData({
      products,
      channels,
      records,
      warningProducts,
      channelSummaries,
      categoryNames: this.data.categories,
      productSpecs: products.map((product) => `${product.name}｜${product.spec}`),
      selectedCategoryName: this.data.categories[this.data.productForm.categoryIndex] || '未分类',
      selectedChannelTypeLabel: CHANNEL_TYPES[this.data.channelForm.typeIndex].label,
      visibleRecords: records.filter((record) => record.type === this.data.activeTab && isDateInRange(record.date, this.data.recordFilter.startDate, this.data.recordFilter.endDate)),
      recordTitle: RECORD_TITLES[this.data.activeTab] || '',
      dashboard: {
        totalStock: this.data.products.reduce((sum, product) => sum + toNumber(product.stock), 0),
        totalAmount: money(totalAmount),
        warningCount: warningProducts.length,
        productCount: this.data.products.length,
        channelTotal: money(channelTotal),
        todayInboundQuantity: todayInbound.quantity,
        todayInboundAmount: money(todayInbound.amount),
        todayOutboundQuantity: todayOutbound.quantity,
        todayOutboundAmount: money(todayOutbound.amount),
        monthInboundQuantity: monthInbound.quantity,
        monthInboundAmount: money(monthInbound.amount),
        monthOutboundQuantity: monthOutbound.quantity,
        monthOutboundAmount: money(monthOutbound.amount),
        monthTotalQuantity: monthInbound.quantity + monthOutbound.quantity,
        monthTotalAmount: money(monthInbound.amount + monthOutbound.amount)
      }
    })
    this.persist()
  },

  sumRecordsByDate(type, startDate, endDate) {
    return this.data.records
      .filter((record) => record.type === type && isDateInRange(record.date, startDate, endDate))
      .reduce((sum, record) => ({
        quantity: sum.quantity + toNumber(record.quantity),
        amount: sum.amount + toNumber(record.amount)
      }), { quantity: 0, amount: 0 })
  },

  persist() {
    wx.setStorageSync(STORAGE_KEY, {
      categories: this.data.categories,
      products: this.data.products.map(({ id, name, spec, category, stock, price, warningLine }) => ({
        id,
        name,
        spec,
        category,
        stock: toNumber(stock),
        price: toNumber(price),
        warningLine: toNumber(warningLine)
      })),
      channels: this.data.channels.map(({ id, name, type, balance }) => ({ id, name, type, balance: toNumber(balance) })),
      records: this.data.records.map(({ id, type, date, productName, spec, supplier, quantity, unitPrice, amount, remark, orderNo, logisticsCompany, logisticsNo, operator }) => ({
        id,
        type,
        date,
        productName,
        spec,
        supplier,
        quantity: toNumber(quantity),
        unitPrice: unitPrice === undefined ? undefined : toNumber(unitPrice),
        amount: toNumber(amount),
        remark,
        orderNo,
        logisticsCompany,
        logisticsNo,
        operator
      }))
    })
  },

  onProductInput(event) {
    this.setData({ [`productForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  onCategoryPick(event) {
    this.setData({ 'productForm.categoryIndex': Number(event.detail.value) }, () => this.refreshView())
  },

  resetProductForm() {
    this.setData({
      editingProductId: '',
      productForm: {
        name: '',
        spec: '',
        categoryIndex: 0,
        stock: '',
        price: '',
        warningLine: '10'
      }
    }, () => this.refreshView())
  },

  saveProduct() {
    const form = this.data.productForm
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写商品名称', icon: 'none' })
      return
    }
    const nextProduct = {
      id: this.data.editingProductId || createId('product'),
      name: form.name.trim(),
      spec: form.spec.trim() || '默认规格',
      category: this.data.categories[form.categoryIndex] || '未分类',
      stock: toNumber(form.stock),
      price: toNumber(form.price),
      warningLine: toNumber(form.warningLine)
    }
    const products = this.data.editingProductId
      ? this.data.products.map((product) => (product.id === this.data.editingProductId ? nextProduct : product))
      : [nextProduct, ...this.data.products]
    this.setData({ products }, () => {
      this.resetProductForm()
      wx.showToast({ title: '商品已保存', icon: 'success' })
    })
  },

  editProduct(event) {
    const product = this.data.products.find((item) => item.id === event.currentTarget.dataset.id)
    if (!product) return
    const categoryIndex = Math.max(0, this.data.categories.findIndex((category) => category === product.category))
    this.setData({
      editingProductId: product.id,
      productForm: {
        name: product.name,
        spec: product.spec,
        categoryIndex,
        stock: String(product.stock),
        price: String(toNumber(product.price)),
        warningLine: String(product.warningLine)
      }
    }, () => this.refreshView())
  },

  deleteProduct(event) {
    const productId = event.currentTarget.dataset.id
    this.setData({
      products: this.data.products.filter((product) => product.id !== productId)
    }, () => this.refreshView())
  },

  onChannelInput(event) {
    this.setData({ [`channelForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  onChannelTypePick(event) {
    this.setData({ 'channelForm.typeIndex': Number(event.detail.value) }, () => this.refreshView())
  },

  saveChannel() {
    const form = this.data.channelForm
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写渠道商名称', icon: 'none' })
      return
    }
    this.setData({
      channels: [{
        id: createId('channel'),
        name: form.name.trim(),
        type: CHANNEL_TYPES[form.typeIndex].key,
        balance: toNumber(form.balance)
      }, ...this.data.channels],
      channelForm: { name: '', typeIndex: 0, balance: '' }
    }, () => this.refreshView())
  },

  onInboundInput(event) {
    this.setData({ [`inboundForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  onInboundDatePick(event) {
    this.setData({ 'inboundForm.date': event.detail.value })
  },

  onOutboundInput(event) {
    this.setData({ [`outboundForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  onOutboundDatePick(event) {
    this.setData({ 'outboundForm.date': event.detail.value })
  },

  onReturnInput(event) {
    this.setData({ [`returnForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  onReturnDatePick(event) {
    this.setData({ 'returnForm.date': event.detail.value })
  },

  onFilterDatePick(event) {
    this.setData({ [`recordFilter.${event.currentTarget.dataset.field}`]: event.detail.value }, () => this.refreshView())
  },

  resetDateFilter() {
    this.setData({
      recordFilter: {
        startDate: monthStart(this.data.currentDate),
        endDate: this.data.currentDate
      }
    }, () => this.refreshView())
  },

  findProductByNameSpec(productName, spec) {
    const exactProduct = this.data.products.find((product) => product.name === productName && product.spec === spec)
    return exactProduct || this.data.products.find((product) => product.name === productName)
  },

  upsertStock(productName, spec, quantity, unitPrice) {
    const found = this.findProductByNameSpec(productName, spec)
    const finalSpec = spec || (found ? found.spec : '默认规格')
    if (found) {
      return this.data.products.map((product) => (
        product.id === found.id
          ? { ...product, stock: Math.max(0, toNumber(product.stock) + quantity), price: unitPrice || product.price }
          : product
      ))
    }
    if (quantity < 0) return this.data.products
    return [{
      id: createId('product'),
      name: productName,
      spec: finalSpec,
      category: '未分类',
      stock: quantity,
      price: unitPrice,
      warningLine: 10
    }, ...this.data.products]
  },

  saveInbound() {
    const form = this.data.inboundForm
    const quantity = toNumber(form.quantity)
    const unitPrice = toNumber(form.unitPrice)
    if (!form.productName.trim() || quantity <= 0) {
      wx.showToast({ title: '请填写商品和数量', icon: 'none' })
      return
    }
    const product = this.findProductByNameSpec(form.productName.trim(), '')
    const spec = product ? product.spec : '默认规格'
    const record = {
      id: createId('record'),
      type: 'inbound',
      date: form.date,
      productName: form.productName.trim(),
      spec,
      supplier: form.supplier.trim() || '未填写供应商',
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
      remark: form.remark.trim() || '无备注'
    }
    this.setData({
      products: this.upsertStock(record.productName, spec, quantity, unitPrice),
      records: [record, ...this.data.records],
      inboundForm: { date: this.data.currentDate, productName: '', supplier: '', quantity: '', unitPrice: '', remark: '' }
    }, () => {
      this.refreshView()
      wx.showToast({ title: '入库已保存', icon: 'success' })
    })
  },

  saveOutbound() {
    const form = this.data.outboundForm
    const quantity = toNumber(form.quantity)
    if (!form.productName.trim() || !form.spec.trim() || quantity <= 0) {
      wx.showToast({ title: '请填写商品规格和数量', icon: 'none' })
      return
    }
    const product = this.findProductByNameSpec(form.productName.trim(), form.spec.trim())
    const unitPrice = product ? toNumber(product.price) : 0
    const record = {
      id: createId('record'),
      type: 'outbound',
      date: form.date,
      productName: form.productName.trim(),
      spec: form.spec.trim(),
      quantity,
      unitPrice,
      amount: quantity * unitPrice
    }
    this.setData({
      products: this.upsertStock(record.productName, record.spec, -quantity, unitPrice),
      records: [record, ...this.data.records],
      outboundForm: { date: this.data.currentDate, productName: '', spec: '', quantity: '' }
    }, () => {
      this.refreshView()
      wx.showToast({ title: '出库已保存', icon: 'success' })
    })
  },

  saveReturnInbound() {
    const form = this.data.returnForm
    const quantity = toNumber(form.quantity)
    if (!form.date || !form.orderNo.trim() || !form.productName.trim() || !form.spec.trim() || quantity <= 0) {
      wx.showToast({ title: '请补全退货信息', icon: 'none' })
      return
    }
    const product = this.findProductByNameSpec(form.productName.trim(), form.spec.trim())
    const unitPrice = product ? toNumber(product.price) : 0
    const record = {
      id: createId('record'),
      type: 'returnInbound',
      date: form.date,
      orderNo: form.orderNo.trim(),
      logisticsCompany: form.logisticsCompany.trim() || '未填写物流公司',
      logisticsNo: form.logisticsNo.trim() || '未填写物流单号',
      productName: form.productName.trim(),
      spec: form.spec.trim(),
      quantity,
      operator: form.operator.trim() || '未填写操作人',
      unitPrice,
      amount: quantity * unitPrice,
      remark: form.remark.trim() || '无备注'
    }
    this.setData({
      products: this.upsertStock(record.productName, record.spec, quantity, unitPrice),
      records: [record, ...this.data.records],
      returnForm: { date: this.data.currentDate, orderNo: '', logisticsCompany: '', logisticsNo: '', productName: '', spec: '', quantity: '', operator: '', remark: '' }
    }, () => {
      this.refreshView()
      wx.showToast({ title: '退货已保存', icon: 'success' })
    })
  }
})
