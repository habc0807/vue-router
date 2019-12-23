import View from './components/view'
import Link from './components/link'

export let _Vue

/**
 * install 方法 Vue.use(vueRouter)时 相当于 Vue.use(vueRouter.install())
 * @param {*} Vue
 */
export function install (Vue) {
  // vue-router注册处理 只注册一次即可
  if (install.installed && _Vue === Vue) return
  install.installed = true

  // 保存Vue实例，上方便内部、外部使用
  _Vue = Vue

  const isDef = v => v !== undefined

  // todo 
  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  /**
   * 注册vue-router的时候，给所有的vue组件混入两个生命周期beforeCreate、destroyed
   * 在beforeCreated中初始化vue-router，并将_route响应式
   */
  Vue.mixin({
    beforeCreate () {
      // 如果vue的实例的自定义属性没有router的化，把vue实例挂在到vue实例的_routerRoot上
      if (isDef(this.$options.router)) {
        // 给大佬递猫 把自己递大佬
        this._routerRoot = this

        // 把自定义属性router挂载到_router上
        this._router = this.$options.router

        // 初始化vue-router。init为初始化的核心方法
        this._router.init(this)

        // 将当前的route信息 隐式挂到当前组件的data上，使其成为响应式变量。
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 找爸爸，自身没有_routerRoot，找其父组件的_routerRoot
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    // todo干啥的
    destroyed () {
      registerInstance(this)
    }
  })

  /**
   * 给Vue添加实例对象$router和$route
   * $router为router实例
   * $route为当前的route
   */
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })

  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

  /**
   * 注入两个全局组件
   * router-view
   * router-link
   */
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  /**
   * Vue.config 是一个对象，包含了Vue的全局配置
   * 将vue-router的hook进行Vue的合并策略
   */
  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
