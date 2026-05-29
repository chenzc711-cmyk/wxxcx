const STORAGE_KEY = 'warehouse-system-data'

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
  warehouses: [
    { id: 'warehouse-main', name: '主仓', location: '默认仓库' },
    { id: 'warehouse-taizhou', name: '台州仓', location: '台州区域' }
  ],
  products: [
    { id: 'product-1', name: '3W品牌洗护套装', sku: '3W-SET-001', warehouseId: 'warehouse-main', stock: 120, price: 89, warningLine: 30 },
    { id: 'product-2', name: '伊文精品礼盒', sku: 'YW-GIFT-001', warehouseId: 'warehouse-taizhou', stock: 18, price: 168, warningLine: 20 }
  ],
  channels: [
    { id: 'channel-1', name: '普通渠道 A', type: 'normal', balance: 5600 },
    { id: 'channel-2', name: '3W 直营网点', type: 'brand3w', balance: 12800 },
    { id: 'channel-3', name: '台州伊文代理', type: 'taizhouYiwen', balance: 9300 }
  ],
  records: [
    { id: 'record-1', type: 'inbound', productId: 'product-1', productName: '3W品牌洗护套装', quantity: 40, remark: '期初入库', date: '2026-05-01 09:00' },
    { id: 'record-2', type: 'outbound', productId: 'product-2', productName: '伊文精品礼盒', quantity: 6, remark: '渠道发货', date: '2026-05-05 15:30' },
    { id: 'record-3', type: 'returnInbound', productId: 'product-1', productName: '3W品牌洗护套装', quantity: 3, remark: '客户退货', date: '2026-05-07 11:20' }
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

function formatDate(date) {
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Page({
  data: {
    tabs: [
      { key: 'dashboard', label: '仪表盘' },
      { key: 'inventory', label: '库存数量' },
      { key: 'outbound', label: '出库记录' },
      { key: 'inbound', label: '入库记录' },
      { key: 'returnInbound', label: '退货入库记录' },
      { key: 'warehouses', label: '仓库数量' },
      { key: 'channels', label: '渠道商款项' }
    ],
    activeTab: 'dashboard',
    warehouses: [],
    products: [],
    channels: [],
    records: [],
    dashboard: {},
    channelSummaries: [],
    warningProducts: [],
    visibleRecords: [],
    productNames: [],
    warehouseNames: [],
    selectedWarehouseName: '',
    selectedProductName: '请先添加商品',
    selectedChannelTypeLabel: CHANNEL_TYPES[0].label,
    channelTypeLabels: CHANNEL_TYPES.map((item) => item.label),
    recordTitle: '',
    editingProductId: '',
    productForm: {
      name: '',
      sku: '',
      warehouseIndex: 0,
      stock: '',
      price: '',
      warningLine: '10'
    },
    warehouseForm: {
      name: '',
      location: ''
    },
    channelForm: {
      name: '',
      typeIndex: 0,
      balance: ''
    },
    recordForm: {
      productIndex: 0,
      quantity: '',
      remark: ''
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
    const warehouses = this.data.warehouses.map((warehouse) => ({
      ...warehouse,
      stock: this.data.products
        .filter((product) => product.warehouseId === warehouse.id)
        .reduce((sum, product) => sum + toNumber(product.stock), 0)
    }))

    const products = this.data.products.map((product) => {
      const warehouse = this.data.warehouses.find((item) => item.id === product.warehouseId)
      return {
        ...product,
        warehouseName: warehouse ? warehouse.name : '未分配仓库',
        amount: money(toNumber(product.stock) * toNumber(product.price)),
        price: money(product.price)
      }
    })

    const channels = this.data.channels.map((channel) => {
      const channelType = CHANNEL_TYPES.find((item) => item.key === channel.type)
      return {
        ...channel,
        typeLabel: channelType ? channelType.label : channel.type,
        balance: money(channel.balance)
      }
    })

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
    const totalAmount = this.data.products.reduce((sum, product) => sum + toNumber(product.stock) * toNumber(product.price), 0)
    const channelTotal = this.data.channels.reduce((sum, channel) => sum + toNumber(channel.balance), 0)

    this.setData({
      warehouses,
      products,
      channels,
      warningProducts,
      channelSummaries,
      warehouseNames: warehouses.map((warehouse) => warehouse.name),
      productNames: products.map((product) => product.name),
      selectedWarehouseName: warehouses[this.data.productForm.warehouseIndex] ? warehouses[this.data.productForm.warehouseIndex].name : '请先添加仓库',
      selectedProductName: products[this.data.recordForm.productIndex] ? products[this.data.recordForm.productIndex].name : '请先添加商品',
      selectedChannelTypeLabel: CHANNEL_TYPES[this.data.channelForm.typeIndex].label,
      visibleRecords: this.data.records.filter((record) => record.type === this.data.activeTab),
      recordTitle: RECORD_TITLES[this.data.activeTab] || '',
      dashboard: {
        totalStock: this.data.products.reduce((sum, product) => sum + toNumber(product.stock), 0),
        totalAmount: money(totalAmount),
        warningCount: warningProducts.length,
        productCount: this.data.products.length,
        warehouseCount: warehouses.length,
        channelTotal: money(channelTotal)
      }
    })
    this.persist()
  },

  persist() {
    wx.setStorageSync(STORAGE_KEY, {
      warehouses: this.data.warehouses.map(({ id, name, location }) => ({ id, name, location })),
      products: this.data.products.map(({ id, name, sku, warehouseId, stock, price, warningLine }) => ({
        id,
        name,
        sku,
        warehouseId,
        stock: toNumber(stock),
        price: toNumber(price),
        warningLine: toNumber(warningLine)
      })),
      channels: this.data.channels.map(({ id, name, type, balance }) => ({ id, name, type, balance: toNumber(balance) })),
      records: this.data.records
    })
  },

  onProductInput(event) {
    this.setData({ [`productForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  onWarehousePick(event) {
    this.setData({ 'productForm.warehouseIndex': Number(event.detail.value) }, () => this.refreshView())
  },

  resetProductForm() {
    this.setData({
      editingProductId: '',
      productForm: {
        name: '',
        sku: '',
        warehouseIndex: 0,
        stock: '',
        price: '',
        warningLine: '10'
      }
    })
  },

  saveProduct() {
    const form = this.data.productForm
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写商品名称', icon: 'none' })
      return
    }
    const warehouse = this.data.warehouses[form.warehouseIndex] || this.data.warehouses[0]
    const nextProduct = {
      id: this.data.editingProductId || createId('product'),
      name: form.name.trim(),
      sku: form.sku.trim() || '未填写编码',
      warehouseId: warehouse ? warehouse.id : '',
      stock: toNumber(form.stock),
      price: toNumber(form.price),
      warningLine: toNumber(form.warningLine)
    }
    const products = this.data.editingProductId
      ? this.data.products.map((product) => (product.id === this.data.editingProductId ? nextProduct : product))
      : [nextProduct, ...this.data.products]
    this.setData({ products }, () => {
      this.resetProductForm()
      this.refreshView()
      wx.showToast({ title: '商品已保存', icon: 'success' })
    })
  },

  editProduct(event) {
    const product = this.data.products.find((item) => item.id === event.currentTarget.dataset.id)
    if (!product) return
    const warehouseIndex = Math.max(0, this.data.warehouses.findIndex((warehouse) => warehouse.id === product.warehouseId))
    this.setData({
      editingProductId: product.id,
      productForm: {
        name: product.name,
        sku: product.sku,
        warehouseIndex,
        stock: String(product.stock),
        price: String(toNumber(product.price)),
        warningLine: String(product.warningLine)
      }
    })
  },

  deleteProduct(event) {
    const productId = event.currentTarget.dataset.id
    this.setData({
      products: this.data.products.filter((product) => product.id !== productId),
      records: this.data.records.filter((record) => record.productId !== productId)
    }, () => this.refreshView())
  },

  onWarehouseInput(event) {
    this.setData({ [`warehouseForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  saveWarehouse() {
    const form = this.data.warehouseForm
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写仓库名称', icon: 'none' })
      return
    }
    this.setData({
      warehouses: [{ id: createId('warehouse'), name: form.name.trim(), location: form.location.trim() || '未填写位置' }, ...this.data.warehouses],
      warehouseForm: { name: '', location: '' }
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

  onRecordProductPick(event) {
    this.setData({ 'recordForm.productIndex': Number(event.detail.value) }, () => this.refreshView())
  },

  onRecordInput(event) {
    this.setData({ [`recordForm.${event.currentTarget.dataset.field}`]: event.detail.value })
  },

  saveRecord() {
    if (!this.data.products.length) {
      wx.showToast({ title: '请先添加商品', icon: 'none' })
      return
    }
    const form = this.data.recordForm
    const quantity = toNumber(form.quantity)
    if (quantity <= 0) {
      wx.showToast({ title: '请填写有效数量', icon: 'none' })
      return
    }
    const product = this.data.products[form.productIndex] || this.data.products[0]
    const type = this.data.activeTab
    const signedQuantity = type === 'outbound' ? -quantity : quantity
    const products = this.data.products.map((item) => (
      item.id === product.id ? { ...item, stock: Math.max(0, toNumber(item.stock) + signedQuantity) } : item
    ))
    const record = {
      id: createId('record'),
      type,
      productId: product.id,
      productName: product.name,
      quantity,
      remark: form.remark.trim() || '无备注',
      date: formatDate(new Date())
    }
    this.setData({
      products,
      records: [record, ...this.data.records],
      recordForm: { productIndex: 0, quantity: '', remark: '' }
    }, () => {
      this.refreshView()
      wx.showToast({ title: '记录已保存', icon: 'success' })
    })
  }
})
