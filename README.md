这是一篇集合了从如何查看 `vue-router`源码（v3.1.3），到 `vue-router`源码解析，以及扩展了相关涉及的知识点，科普了完整的导航解析流程图，一时读不完，建议收藏。

### 如何查看vue-router源码

查看源码的方法有很多，下面是我自己读vue-router源码的两种方法，大家都是怎么查看源码的，欢迎在评论区留言。

##### 查看vue-router源码 方法一：

1. 下载好 `vue-router` 源码，安装好依赖。
2. 找到 `build/config.js` 修改 `module.exports`，只保留 `es`，其它的注释。

```javascript
module.exports = [
    {
        file: resolve('dist/vue-router.esm.js'),
        format: 'es'
    }
].map(genConfig)
```

3. 在根目录下创建一个 `auto-running.js` 文件，用于监听src文件的改变的脚本，监听到`vue-router` 源码变更就从新构建vue-router执行 `node auto-running.js` 命令。auto-running.js的代码如下：

```javascript
const { exec } = require('child_process')
const fs = require('fs')

let building = false

fs.watch('./src', {
  recursive: true
}, (event, filename) => {
  if (building) {
    return
  } else {
    building = true
    console.log('start: building ...')
    exec('npm run build', (err, stdout, stderr) => {
      if (err) {
        console.log(err)
      } else {
        console.log('end: building: ', stdout)
      }
      building = false
    })
  }
})
```

4.执行 `npm run  dev`命令，将 `vue-router` 跑起来

##### 查看vue-router源码方法二：

一般项目中的node_modules的vue-router的src不全 不方便查看源码；

所以需要自己下载一个vue-router的完整版，看到哪里不清楚了，就去vue-router的node_modules的 `dist>vue-router.esm.js` 文件里去打debugger。

为什么要在vue-router.esm.js文件里打点而不是vue-router.js；是因为webpack在进行打包的时候用的是esm.js文件。

### 为什么要在esm.js文件中打debugger

在vue-router源码的 `dist/`目录，有很多不同的构建版本。

版本 | UMD | Common JS | ES Module(基于构建工具使用) | ES Modules(直接用于浏览器)
----|------|------|------|------
完整版 | vue-router.js | vue-router.common.js | vue-router.esm.js | vue-router.esm.browser.js
完整版（生产环境） | vue-router.min.js | | | vue-router.esm.browser.min.js  

- 完整版：同时包含编译器和运行时的版本
- UMD：UMD版本可以通过 `<script>` 标签直接用在浏览器中。
- CommonJS: CommonJS版本用来配合老的打包工具比如webpack1。
- ES Module: 有两个ES Modules构建文件：
    1. 为打包工具提供的ESM，ESM被设计为可以被静态分析，打包工具可以利用这一点来进行“tree-shaking”。
    2. 为浏览器提供的ESM，在现代浏览器中通过 `<script type="module">` 直接导入

现在清楚为什么要在esm.js文件中打点，因为esm文件为打包工具提供的esm，打包工具可以进行“tree-shaking”。

### vue-router项目src的目录树

```
.
├── components
│   ├── link.js
│   └── view.js
├── create-matcher.js
├── create-route-map.js
├── history
│   ├── abstract.js
│   ├── base.js
│   ├── errors.js
│   ├── hash.js
│   └── html5.js
├── index.js
├── install.js
└── util
    ├── async.js
    ├── dom.js
    ├── location.js
    ├── misc.js
    ├── params.js
    ├── path.js
    ├── push-state.js
    ├── query.js
    ├── resolve-components.js
    ├── route.js
    ├── scroll.js
    ├── state-key.js
    └── warn.js
```

### vue-router的使用

`vue-router` 是vue的插件，其使用方式跟普通的vue插件类似都需要按照、插件和注册。
vue-router的基础使用在 `vue-router` 项目中 `examples/basic`，注意代码注释。

```javascript
// 0.在模块化工程中使用，导入Vue和VueRouter
import Vue from 'vue'
import VueRouter from 'vue-router'


// 1. 插件的使用，必须通过Vue.use()明确地安装路由
// 在全局注入了两个组件 <router-view> 和 <router-link>,
// 并且在全局注入 $router 和 $route，
// 可以在实例化的所有的vue组件中使用 $router路由实例、$route当前路由对象
Vue.use(VueRouter)

// 2. 定义路由组件
const Home = { template: '<div>home</div>' }
const Foo = { template: '<div>foo</div>' }
const Bar = { template: '<div>bar</div>' }
const Unicode = { template: '<div>unicode</div>' }

// 3. 创建路由实例 实例接收了一个对象参数，
// 参数mode:路由模式，
// 参数routes路由配置 将组件映射到路由
const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Home },
    { path: '/foo', component: Foo },
    { path: '/bar', component: Bar },
    { path: '/é', component: Unicode }
  ]
})

// 4. 创建和挂载根实例
// 通过router参数注入到vue里 让整个应用都有路由参数
// 在应用中通过组件<router-view>，进行路由切换
// template里有写特殊用法 我们晚点讨论
new Vue({
  router,
  data: () => ({ n: 0 }),
  template: `
    <div id="app">
      <h1>Basic</h1>
      <ul>
        <!-- 使用 router-link 创建a标签来定义导航链接. to属性为执行链接-->
        <li><router-link to="/">/</router-link></li>
        <li><router-link to="/foo">/foo</router-link></li>
        <li><router-link to="/bar">/bar</router-link></li>
        <!-- 通过tag属性可以指定渲染的标签 这里是li标签  event自定义了事件-->
        <router-link tag="li" to="/bar" :event="['mousedown', 'touchstart']">
          <a>/bar</a>
        </router-link>
        <li><router-link to="/é">/é</router-link></li>
        <li><router-link to="/é?t=%25ñ">/é?t=%ñ</router-link></li>
        <li><router-link to="/é#%25ñ">/é#%25ñ</router-link></li>
        <!-- router-link可以作为slot，插入内容，如果内容中有a标签，会把to属性的链接给内部的a标签 -->
        <router-link to="/foo" v-slot="props">
          <li :class="[props.isActive && 'active', props.isExactActive && 'exact-active']">
            <a :href="props.href" @click="props.navigate">{{ props.route.path }} (with v-slot).</a>
          </li>
        </router-link>
      </ul>
      <button id="navigate-btn" @click="navigateAndIncrement">On Success</button>
      <pre id="counter">{{ n }}</pre>
      <pre id="query-t">{{ $route.query.t }}</pre>
      <pre id="hash">{{ $route.hash }}</pre>
      
      <!-- 路由匹配到的组件将渲染在这里 -->
      <router-view class="view"></router-view>
    </div>
  `,

  methods: {
    navigateAndIncrement () {
      const increment = () => this.n++
      // 路由注册后，我们可以在Vue实例内部通过 this.$router 访问路由实例，
      // 通过 this.$route 访问当前路由
      if (this.$route.path === '/') {
        // this.$router.push 会向history栈添加一个新的记录
        // <router-link>内部也是调用来 router.push，实现原理相同
        this.$router.push('/foo', increment)
      } else {
        this.$router.push('/', increment)
      }
    }
  }
}).$mount('#app')
```
使用 `this.$router` 的原因是并不想用户在每个独立需要封装路由的组件中都导入路由。`<router-view>` 是最顶层的出口，渲染最高级路由匹配的组件，要在嵌套的出口中渲染组件，需要在 `VueRouter` 的参数中使用 `children` 配置。



### 注入路由和路由实例化都干了点啥

Vue提供了插件注册机制是，每个插件都需要实现一个静态的 `install`方法，当执行 `Vue.use` 注册插件的时候，就会执行 `install` 方法，该方法执行的时候第一个参数强制是 `Vue`对象。

##### 为什么install的插件方法第一个参数是Vue

 Vue插件的策略，编写插件的时候就不需要`inport Vue`了，在注册插件的时候，给插件强制插入一个参数就是 `Vue` 实例。

##### `vue-router`注入的时候时候，install了什么

```javascript
// 引入install方法
import { install } from './install'

export default class VueRouter {
    // 在VueRouter类中定义install静态方法
    static install: () => void;
}

// 给VueRouter.install复制
VueRouter.install = install

// 以链接的形式引入vue-router插件 直接注册vue-router
if (inBrowser && window.Vue) {
  window.Vue.use(VueRouter)
}
```
在 `vue-router`源码中，入口文件是 `src/index.js`，其中定义了 `VueRouter` 类，在VueRouter类中定义静态方法 `install`，它定义在 `src/install.js`中。

##### src/install.js文件中路由注册的时候install了什么

```javascript
import View from './components/view'
import Link from './components/link'

// 导出Vue实例
export let _Vue

// install 方法 当Vue.use(vueRouter)时 相当于 Vue.use(vueRouter.install())
export function install (Vue) {
  // vue-router注册处理 只注册一次即可
  if (install.installed && _Vue === Vue) return
  install.installed = true

  // 保存Vue实例，方便其它插件文件使用
  _Vue = Vue

  const isDef = v => v !== undefined

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
      // 如果vue的实例的自定义属性有router的话，把vue实例挂在到vue实例的_routerRoot上
      if (isDef(this.$options.router)) {
        // 给大佬递猫 把自己递大佬
        this._routerRoot = this

        // 把VueRouter实例挂载到_router上
        this._router = this.$options.router

        // 初始化vue-router，init为核心方法，init定义在src/index.js中，晚些再看
        this._router.init(this)

        // 将当前的route对象 隐式挂到当前组件的data上，使其成为响应式变量。
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 找爸爸，自身没有_routerRoot，找其父组件的_routerRoot
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
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
   * <router-view>
   * <router-link>
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
```
为了保证 `VueRouter` 只执行一次，当执行 `install` 逻辑的时候添加一个标识 `installed`。用一个全局变量保存Vue，方便VueRouter插件各处对Vue的使用。这个思想就很好，以后自己写Vue插件的时候就可以存一个全局的 `_Vue`。

VueRouter安装的核心是通过 `mixin`，向应用的所有组件混入 `beforeCreate` 和 `destroyed`钩子函数。在`beforeCreate`钩子函数中，定义了私有属性`_routerRoot` 和 `_router`。
- _routerRoot: 将Vue实例赋值给_routerRoot，相当于把Vue跟实例挂载到每个组件的_routerRoot的属性上，通过 `$parent._routerRoot` 的方式，让所有组件都能拥有`_routerRoot`始终指向根`Vue`实例。
- _router：通过 `this.$options.router`方式，让每个vue组件都能拿到VueRouter实例

用Vue的`defineReactive`方法把 `_route` 变成响应式对象。`this._router.init()` 初始化了`router`，init方法在 `src/index.js`中，init方法很重要，后面介绍。`registerInstance` 也是后面介绍。

然后给Vue的原型上挂载了两个对象属性 `$router` 和 `$route`，在应用的所有组件实例上都可以访问 `this.$router` 和 `this.$route`，`this.$router` 是路由实例，对外暴露了像`this.$router.push`、`this.$router.replace`等很多api方法，`this.$route`包含了当前路由的所有信息。是很有用的两个方法。

后面通过 `Vue.component` 方法定义了全局的 `<router-link>` 和 `<router-view>` 两个组件。`<router-link>`类似于a标签，`<router-view>` 是路由出口，在 `<router-view>` 切换路由渲染不同Vue组件。

最后定义了路由守卫的合并策略，采用了Vue的合并策略。

##### 小结

Vue插件需要提供 `install` 方法，用于插件的注入。VueRouter安装时会给应用的所有组件注入 `beforeCreate` 和 `destoryed` 钩子函数。在 `beforeCreate` 中定义一些私有变量，初始化了路由。全局注册了两个组件和两个api。


### 那么问题来了，初始化路由都干了啥

VueRouter类定义很多属性和方法，我们先看看初始化路由方法 `init`。初始化路由的代码是 `this._router.init(this)`，init接收了Vue实例，下面的app就是Vue实例。注释写的很详细了，这里就不文字叙述了。

```javascript
init (app: any /* Vue component instance */) {
    // vueRouter可能会实例化多次 apps用于存放多个vueRouter实例
    this.apps.push(app)

    // 保证VueRouter只初始化一次，如果初始化了就终止后续逻辑
    if (this.app) {
      return
    }

    // 将vue实例挂载到vueRouter上，router挂载到Vue实例上，哈 给大佬递猫
    this.app = app

    // history是vueRouter维护的全局变量，很重要
    const history = this.history

    // 针对不同路由模式做不同的处理 transitionTo是history的核心方法，后面再细看
    if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation())
    } else if (history instanceof HashHistory) {
      const setupHashListener = () => {
        history.setupListeners()
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      )
    }

    // 路由全局监听，维护当前的route
    // 因为_route在install执行时定义为响应式属性，
    // 当route变更时_route更新，后面的视图更新渲染就是依赖于_route
    history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
  }
```

![history](https://user-gold-cdn.xitu.io/2019/12/3/16ecb2970a927b53?w=395&h=285&f=jpeg&s=36710)

接下来看看 `new VueRouter` 时constructor做了什么。

```javascript
constructor (options: RouterOptions = {}) {
    this.app = null
    this.apps = []
    this.options = options
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    // 创建 matcher 匹配函数，createMatcher函数返回一个对象 {match, addRoutes} 很重要
    this.matcher = createMatcher(options.routes || [], this)

    // 默认hash模式
    let mode = options.mode || 'hash'

    // h5的history有兼容性 对history做降级处理
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode

    // 不同的mode，实例化不同的History类, 后面的this.history就是History的实例
    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
}
```

`constructor` 的 `options` 是实例化路由是的传参，通常是一个对象 `{routes, mode: 'history'}`, routes是必传参数，mode默认是hash模式。`vueRouter`还定义了哪些东西呢。

```javascript
...

match (
    raw: RawLocation,
    current?: Route,
    redirectedFrom?: Location
  ): Route {
    return this.matcher.match(raw, current, redirectedFrom)
}

// 获取当前的路由
get currentRoute (): ?Route {
    return this.history && this.history.current
}
  
init(options) { ... }

beforeEach(fn) { ... }
beforeResolve(fn) { ... }
afterEach(fn) { ... }
onReady(cb) { ... }

push(location) { ... }
replace(location) { ... }
back() { ... }
go(n) { ... }
forward() { ... }

// 获取匹配到的路由组件
getMatchedComponents (to?: RawLocation | Route): Array<any> {
    const route: any = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute
    if (!route) {
      return []
    }
    return [].concat.apply([], route.matched.map(m => {
      return Object.keys(m.components).map(key => {
        return m.components[key]
      })
    }))
}

addRoutes (routes: Array<RouteConfig>) {
    this.matcher.addRoutes(routes)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
}
```

在实例化的时候，vueRouter仿照history定义了一些api：`push`、`replace`、`back`、`go`、`forward`，还定义了路由匹配器、添加router动态更新方法等。

##### 小结

install的时候先执行init方法，然后实例化vueRouter的时候定义一些属性和方法。init执行的时候通过 `history.transitionTo` 做路由过渡。`matcher` 路由匹配器是后面路由切换，路由和组件匹配的核心函数。所以...en

### matcher了解一下吧

在VueRouter对象中有以下代码:
```javascript
// 路由匹配器，createMatcher函数返回一个对象 {match, addRoutes}
this.matcher = createMatcher(options.routes || [], this)

...

match (
    raw: RawLocation,
    current?: Route,
    redirectedFrom?: Location
): Route {
    return this.matcher.match(raw, current, redirectedFrom)
}

...

const route = this.match(location, current)
```

我们可以观察到 `route` 对象通过 `this.match()` 获取，`match` 又是通过 `this.matcher.match()`，而 `this.matcher` 是通过 `createMatcher` 函数处理。接下来我们去看看createMatcher函数的实现。

##### createMatcher

`createMatcher` 相关的实现都在 `src/create-matcher.js`中。

```javascript
/**
 * 创建createMatcher 
 * @param {*} routes 路由配置
 * @param {*} router 路由实例
 * 
 * 返回一个对象 {
 *  match, // 当前路由的match 
 *  addRoutes // 更新路由配置
 * }
 */
export function createMatcher (
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  const { pathList, pathMap, nameMap } = createRouteMap(routes)

  function addRoutes (routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
  }

  function match (
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {

  ...

  return {
    match,
    addRoutes
  }
}
```
`createMatcher` 接收2个参数，`routes` 是用户定义的路由配置，`router` 是 `new VueRouter` 返回的实例。`routes` 是一个定义了路由配置的数组，通过 `createRouteMap` 函数处理为 `pathList, pathMap, nameMap`，返回了一个对象 `{match, addRoutes}` 。也就是说 `matcher` 是一个对象，它对外暴露了 `match` 和 `addRoutes` 方法。

一会我们先了解下 `pathList, pathMap, nameMap`分别是什么，稍后在来看createRouteMap的实现。

- pathList：路由路径数组，存储所有的path
- pathMap：路由路径与路由记录的映射表，表示一个path到RouteRecord的映射关系
- nameMap：路由名称与路由记录的映射表，表示name到RouteRecord的映射关系

##### RouteRecord

那么路由记录是什么样子的？
```javascript
const record: RouteRecord = {
    path: normalizedPath,
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
    components: route.components || { default: route.component },
    instances: {},
    name,
    parent,
    matchAs,
    redirect: route.redirect,
    beforeEnter: route.beforeEnter,
    meta: route.meta || {},
    props:
      route.props == null
        ? {}
        : route.components
          ? route.props
          : { default: route.props }
}
```
`RouteRecord` 是一个对象，包含了一条路由的所有信息: 路径、路由正则、路径对应的组件数组、组件实例、路由名称等等。

![router对象](https://user-gold-cdn.xitu.io/2019/12/3/16ecb290ba8af23d?w=826&h=281&f=jpeg&s=45489)

##### createRouteMap

`createRouteMap` 函数的实现在 `src/create-route-map`中：

```javascript
/**
 * 
 * @param {*} routes 用户路由配置
 * @param {*} oldPathList 老pathList
 * @param {*} oldPathMap 老pathMap
 * @param {*} oldNameMap 老nameMap
 */
export function createRouteMap (
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>
): {
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>
} {
  // pathList被用于控制路由匹配优先级
  const pathList: Array<string> = oldPathList || []
  // 路径路由映射表
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  // 路由名称路由映射表
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)

  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route)
  })

  // 确保通配符路由总是在最后
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }

  ...

  return {
    pathList,
    pathMap,
    nameMap
  }
}
```

`createRouteMap` 函数主要是把用户的路由匹配转换成一张路由映射表，后面路由切换就是依据这几个映射表。`routes` 为每一个 `route` 执行 `addRouteRecord` 方法生成一条记录，记录在上面展示过了，我们来看看是如何生成一条记录的。

##### addRouteRecord

```javascript
function addRouteRecord (
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
  route: RouteConfig,
  parent?: RouteRecord,
  matchAs?: string
) {

  //...
  // 先创建一条路由记录
  const record: RouteRecord = { ... }

  // 如果该路由记录 嵌套路由的话 就循环遍历解析嵌套路由
  if (route.children) {
    // ...
    // 通过递归的方式来深度遍历，并把当前的record作为parent传入
    route.children.forEach(child => {
      const childMatchAs = matchAs
        ? cleanPath(`${matchAs}/${child.path}`)
        : undefined
      addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
    })
  }

  // 如果有多个相同的路径，只有第一个起作用，后面的会被忽略
  // 对解析好的路由进行记录，为pathList、pathMap添加一条记录
  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }
  // ...
}
```

`addRouteRecord` 函数，先创建一条路由记录对象。如果当前的路由记录有嵌套路由的话，就循环遍历继续创建路由记录，并按照路径和路由名称进行路由记录映射。这样所有的路由记录都被记录了。整个`RouteRecord`就是一个树型结构，其中 `parent` 表示父的 `RouteRecord`。

```javascript
if (name) {
  if (!nameMap[name]) {
    nameMap[name] = record
  }
  // ...
}
```
如果我们在路由配置中设置了 `name`，会给 `nameMap`添加一条记录。`createRouteMap` 方法执行后，我们就可以得到路由的完整记录，并且得到path、name对应的路由映射。通过`path` 和 `name` 能在 `pathMap` 和 `nameMap`快速查到对应的 `RouteRecord`。

```javascript
export function createMatcher (
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  //...
  return {
    match,
    addRoutes
  }
}
```
还记得 `createMatcher` 的返回值中有个 `match`，接下里我们看 `match`的实现。

##### match 
```javascript
/**
  * 
  * @param {*} raw 是RawLocation类型 是个url字符串或者RawLocation对象
  * @param {*} currentRoute 当前的route
  * @param {*} redirectedFrom 重定向 （不是重要，可忽略）
  */
function match (
  raw: RawLocation,
  currentRoute?: Route,
  redirectedFrom?: Location
): Route {

    // location 是一个对象类似于
    // {"_normalized":true,"path":"/","query":{},"hash":""}
    const location = normalizeLocation(raw, currentRoute, false, router)
    const { name } = location

    // 如果有路由名称 就进行nameMap映射 
    // 获取到路由记录 处理路由params 返回一个_createRoute处理的东西
    if (name) {
      const record = nameMap[name]
      if (process.env.NODE_ENV !== 'production') {
        warn(record, `Route with name '${name}' does not exist`)
      }
      if (!record) return _createRoute(null, location)
      const paramNames = record.regex.keys
        .filter(key => !key.optional)
        .map(key => key.name)

      if (typeof location.params !== 'object') {
        location.params = {}
      }

      if (currentRoute && typeof currentRoute.params === 'object') {
        for (const key in currentRoute.params) {
          if (!(key in location.params) && paramNames.indexOf(key) > -1) {
            location.params[key] = currentRoute.params[key]
          }
        }
      }

      location.path = fillParams(record.path, location.params, `named route "${name}"`)
      return _createRoute(record, location, redirectedFrom)
    
    // 如果路由配置了 path，到pathList和PathMap里匹配到路由记录 
    // 如果符合matchRoute 就返回_createRoute处理的东西
    } else if (location.path) {
      location.params = {}
      for (let i = 0; i < pathList.length; i++) {
        const path = pathList[i]
        const record = pathMap[path]
        if (matchRoute(record.regex, location.path, location.params)) {
          return _createRoute(record, location, redirectedFrom)
        }
      }
    }
    // 通过_createRoute返回一个东西
    return _createRoute(null, location)
}
```
`match` 方法接收路径、但前路由、重定向，主要是根据传入的`raw` 和 `currentRoute`处理，返回的是 `_createRoute()`。来看看 `_createRoute`返回了什么，就知道 `match`返回了什么了。

```javascript
function _createRoute (
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {
    if (record && record.redirect) {
      return redirect(record, redirectedFrom || location)
    }
    if (record && record.matchAs) {
      return alias(record, location, record.matchAs)
    }
    return createRoute(record, location, redirectedFrom, router)
}
```
`_createRoute` 函数根据有是否有路由重定向、路由重命名做不同的处理。其中`redirect` 函数和 `alias` 函数最后还是调用了 `_createRoute`，最后都是调用了 `createRoute`。而来自于 `util/route`。

```
/**
 * 
 * @param {*} record 一般为null
 * @param {*} location 路由对象
 * @param {*} redirectedFrom 重定向
 * @param {*} router vueRouter实例
 */
export function createRoute (
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {
  const stringifyQuery = router && router.options.stringifyQuery

  let query: any = location.query || {}
  try {
    query = clone(query)
  } catch (e) {}

  const route: Route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery),
    matched: record ? formatMatch(record) : []
  }
  if (redirectedFrom) {
    route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
  }
  // 冻结route 一旦创建不可改变
  return Object.freeze(route)
}
```
`createRoute` 可以根据 `record` 和 `location` 创建出来最终返回 `Route` 对象，并且外部不可以修改，只能访问。`Route` 对象中有一个非常重要的属性是 `matched`，它是通过 `formatMatch(record)` 计算的：

```javascript
function formatMatch (record: ?RouteRecord): Array<RouteRecord> {
  const res = []
  while (record) {
    res.unshift(record)
    record = record.parent
  }
  return res
}
```
通过 `record` 循环向上找 `parent`，直到找到最外层，并把所有的 `record` 都push到一个数组中，最终饭后就是一个 `record` 数组，这个 `matched` 为后面的渲染组件提供了重要的作用。

##### 小结

matcher的主流程就是通过`createMatcher` 返回一个对象 `{match, addRoutes}`, `addRoutes` 是动态添加路由用的，平时使用频率比较低，`match` 很重要，返回一个路由对象，这个路由对象上记录当前路由的基本信息，以及路径匹配的路由记录，为路径切换、组件渲染提供了依据。那路径是怎么切换的，又是怎么渲染组件的呢。喝杯谁，我们继续继续往下看。

## 路径切换
还记得 `vue-router` 初始化的时候，调用了 `init` 方法，在 `init`方法里针对不同的路由模式最后都调用了 `history.transitionTo`，进行路由初始化匹配。包括 `history.push` 、`history.replace`的底层都是调用了它。它就是路由切换的方法，很重要。它的实现在 `src/history/base.js`，我们来看看。

```javascript
transitionTo (
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
) {
    // 调用 match方法得到匹配的 route对象
    const route = this.router.match(location, this.current)
    
    // 过渡处理
    this.confirmTransition(
        route,
        () => {
            // 更新当前的 route 对象
            this.updateRoute(route)
            onComplete && onComplete(route)
            
            // 更新url地址 hash模式更新hash值 history模式通过pushState/replaceState来更新
            this.ensureURL()
    
            // fire ready cbs once
            if (!this.ready) {
                this.ready = true
                this.readyCbs.forEach(cb => {
                cb(route)
                })
            }
        },
        err => {
            if (onAbort) {
                onAbort(err)
            }
            if (err && !this.ready) {
                this.ready = true
                this.readyErrorCbs.forEach(cb => {
                cb(err)
                })
            }
        }
    )
}
```
`transitionTo` 可以接收三个参数 `location`、`onComplete`、`onAbort`，分别是目标路径、路经切换成功的回调、路径切换失败的回调。`transitionTo` 函数主要做了两件事：首先根据目标路径 `location` 和当前的路由对象通过 `this.router.match`方法去匹配到目标 `route` 对象。`route`是这个样子的：

```json
const route = {
    fullPath: "/detail/394"
    hash: ""
    matched: [{…}]
    meta: {title: "工单详情"}
    name: "detail"
    params: {id: "394"}
    path: "/detail/394"
    query: {}
}
```

一个包含了目标路由基本信息的对象。然后执行 `confirmTransition`方法进行真正的路由切换。因为有一些异步组件，所以回有一些异步操作。具体的实现：

```javascript
confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    const current = this.current
    const abort = err => {
      // ...
      onAbort && onAbort(err)
    }
    
    // 如果当前路由和之前路由相同 确认url 直接return
    if (
      isSameRoute(route, current) &&
      route.matched.length === current.matched.length
    ) {
      this.ensureURL()
      return abort(new NavigationDuplicated(route))
    }

    // 通过异步队列来交叉对比当前路由的路由记录和现在的这个路由的路由记录 
    // 为了能准确得到父子路由更新的情况下可以确切的知道 哪些组件需要更新 哪些不需要更新
    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched,
      route.matched
    )

    // 在异步队列中执行响应的勾子函数
    // 通过 queue 这个数组保存相应的路由钩子函数
    const queue: Array<?NavigationGuard> = [].concat(
      // leave 的勾子
      extractLeaveGuards(deactivated),
      // 全局的 before 的勾子
      this.router.beforeHooks,
      // in-component update hooks
      extractUpdateHooks(updated),
      // 将要更新的路由的 beforeEnter勾子
      activated.map(m => m.beforeEnter),
      // 异步组件
      resolveAsyncComponents(activated)
    )

    this.pending = route

    // 队列执行的iterator函数 
    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort()
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' &&
              (typeof to.path === 'string' || typeof to.name === 'string'))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort()
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            // 如果有导航钩子，就需要调用next()，否则回调不执行，导航将无法继续
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }

    // runQueue 执行队列 以一种递归回调的方式来启动异步函数队列的执行
    runQueue(queue, iterator, () => {
      const postEnterCbs = []
      const isValid = () => this.current === route

      // 组件内的钩子
      const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
      const queue = enterGuards.concat(this.router.resolveHooks)
      // 在上次的队列执行完成后再执行组件内的钩子
      // 因为需要等异步组件以及是否OK的情况下才能执行
      runQueue(queue, iterator, () => {
        // 确保期间还是当前路由
        if (this.pending !== route) {
          return abort()
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => {
              cb()
            })
          })
        }
      })
    })
}
```
查看目标路由 `route` 和当前前路由 `current` 是否相同，如果相同就调用 `this.ensureUrl` 和 `abort`。

// ensureUrl todo

接下来执行了 `resolveQueue`函数，这个函数要好好看看：

```javascript
function resolveQueue (
  current: Array<RouteRecord>,
  next: Array<RouteRecord>
): {
  updated: Array<RouteRecord>,
  activated: Array<RouteRecord>,
  deactivated: Array<RouteRecord>
} {
  let i
  const max = Math.max(current.length, next.length)
  for (i = 0; i < max; i++) {
    if (current[i] !== next[i]) {
      break
    }
  }
  return {
    updated: next.slice(0, i),
    activated: next.slice(i),
    deactivated: current.slice(i)
  }
}
```
`resolveQueue`函数接收两个参数：当前路由的 `matched` 和目标路由的 `matched`，`matched` 是个数组。通过遍历对比两遍的路由记录数组，当有一个路由记录不一样的时候就记录这个位置，并终止遍历。对于 `next` 从0到i和current都是一样的，从i口开始不同，`next` 从i之后为 `activated`部分，`current`从i之后为 `deactivated`部分，相同部分为 `updated`，由 `resolveQueue` 处理之后就能得到路由变更需要更改的部分。紧接着就可以根据路由的变更执行一系列的钩子函数。完整的导航解析流程有12步，后面会出一篇`vue-router路由切换的内部实现`文章。尽情期待
！

##### 路由改变路由组件是如何渲染的

路由的变更之后，路由组件随之的渲染都是在 `<router-view>` 组件，它的定义在 `src/components/view.js`中。

##### router-view 组件

```javascript
export default {
  name: 'RouterView',
  functional: true,
  props: {
    name: {
      type: String,
      default: 'default'
    }
  },
  render (_, { props, children, parent, data }) {
    data.routerView = true
    const h = parent.$createElement
    const name = props.name
    const route = parent.$route
    const cache = parent._routerViewCache || (parent._routerViewCache = {})
    let depth = 0
    let inactive = false
    while (parent && parent._routerRoot !== parent) {
      if (parent.$vnode && parent.$vnode.data.routerView) {
        depth++
      }
      if (parent._inactive) {
        inactive = true
      }
      parent = parent.$parent
    }
    data.routerViewDepth = depth
    if (inactive) {
      return h(cache[name], data, children)
    }
    const matched = route.matched[depth]
    if (!matched) {
      cache[name] = null
      return h()
    }
    const component = cache[name] = matched.components[name]
    data.registerRouteInstance = (vm, val) => {     
      const current = matched.instances[name]
      if (
        (val && current !== vm) ||
        (!val && current === vm)
      ) {
        matched.instances[name] = val
      }
    }
    ;(data.hook || (data.hook = {})).prepatch = (_, vnode) => {
      matched.instances[name] = vnode.componentInstance
    }
    let propsToPass = data.props = resolveProps(route, matched.props && matched.props[name])
    if (propsToPass) {
      propsToPass = data.props = extend({}, propsToPass)
      const attrs = data.attrs = data.attrs || {}
      for (const key in propsToPass) {
        if (!component.props || !(key in component.props)) {
          attrs[key] = propsToPass[key]
          delete propsToPass[key]
        }
      }
    }
    return h(component, data, children)
  }
}
```
`<router-view>是一个渲染函数`，它的渲染是用了Vue的 `render` 函数，它接收两个参数，第一个是Vue实例，第二个是一个context，通过对象解析的方式可以拿到 `props、children、parent、data`，供创建 `<router-view>` 使用。


#####  router-link 组件
支持用户在具有路由功能的组件里使用，通过使用 `to` 属性指定目标地址，默认渲染成 `<a>`标签，支持通过 `tag` 自定义标签和插槽。

```javascript
export default {
  name: 'RouterLink',
  props: {
    to: {
      type: toTypes,
      required: true
    },
    tag: {
      type: String,
      default: 'a'
    },
    exact: Boolean,
    append: Boolean,
    replace: Boolean,
    activeClass: String,
    exactActiveClass: String,
    event: {
      type: eventTypes,
      default: 'click'
    }
  },
  render (h: Function) {
    const router = this.$router
    const current = this.$route
    const { location, route, href } = router.resolve(this.to, current, this.append)
    const classes = {}
    const globalActiveClass = router.options.linkActiveClass
    const globalExactActiveClass = router.options.linkExactActiveClass
    const activeClassFallback = globalActiveClass == null
            ? 'router-link-active'
            : globalActiveClass
    const exactActiveClassFallback = globalExactActiveClass == null
            ? 'router-link-exact-active'
            : globalExactActiveClass
    const activeClass = this.activeClass == null
            ? activeClassFallback
            : this.activeClass
    const exactActiveClass = this.exactActiveClass == null
            ? exactActiveClassFallback
            : this.exactActiveClass
    const compareTarget = location.path
      ? createRoute(null, location, null, router)
      : route
    classes[exactActiveClass] = isSameRoute(current, compareTarget)
    classes[activeClass] = this.exact
      ? classes[exactActiveClass]
      : isIncludedRoute(current, compareTarget)
    const handler = e => {
      if (guardEvent(e)) {
        if (this.replace) {
          router.replace(location)
        } else {
          router.push(location)
        }
      }
    }
    const on = { click: guardEvent }
    if (Array.isArray(this.event)) {
      this.event.forEach(e => { on[e] = handler })
    } else {
      on[this.event] = handler
    }
    const data: any = {
      class: classes
    }
    if (this.tag === 'a') {
      data.on = on
      data.attrs = { href }
    } else {
      const a = findAnchor(this.$slots.default)
      if (a) {
        a.isStatic = false
        const extend = _Vue.util.extend
        const aData = a.data = extend({}, a.data)
        aData.on = on
        const aAttrs = a.data.attrs = extend({}, a.data.attrs)
        aAttrs.href = href
      } else {
        data.on = on
      }
    }
    return h(this.tag, data, this.$slots.default)
  }
}
```
`<router-link>`的特点：
- `history` 模式和 `hash` 模式的标签一致，针对不支持 `history`的模式会自动降级为 `hash` 模式。
- 可进行路由守卫，不从新加载页面

`<router-link>` 的实现也是基于 `render` 函数。内部实现也是通过 `history.push()` 和 `history.replace()` 实现的。

路径变化是路由中最重要的功能：路由始终会维护当前的线路，；欲呕切换的时候会把当前线路切换到目标线路，切换过程中会执行一些列的导航守卫钩子函数，会更改url, 渲染对应的组件，切换完毕后会把目标线路更新替换为当前线路，作为下一次路径切换的依据。


## 知识补充

### hash模式和history模式的区别
`vue-router` 默认是hash模式，使用hash模式时，变更URL，页面不会重新加载，这种模式从ie6就有了，是一种很稳定的路由模式。但是hash的URL上有个 `#` 号，看上去很丑，后来HTML5出来后，有了history模式。

`history` 模式通过 `history.pushState`来完成url的跳转而无须重新加载页面，解决了hash模式很臭的问题。但是老浏览器不兼容history模式，有些时候我们不得不使用hash模式，来做向下兼容。

`history` 模式，如果访问一个不存在的页面时就会返回 404，为了解决这个问题，需要后台做配置支持：当URL匹配不到任何静态资源的时候，返回一个index.html页面。或者在路由配置里添加一个统一配置的错误页。
```javascript
const router = new VueRouter({
    mode: 'history',
    routes: [
        {
            path: '*',
            component: NotFoundComponent
        }
    ]
})
```

### Vue Router 的 `query` 与 `params` 的使用和区别

在 `vue-router`中有两个概念 `query`和`params`，一开始的时候我对它们分不清，相信也有人分不清。这里做个汇总，方便记忆理解。

- query的使用
```javascript
// 带查询参数，变成 /register?plan=private
router.push({ path: 'register', query: {plan: 'private'}})
```

- params的配置和调用
- 路由配置，使用params传参数，使用name
```javascript
{
    path: '/detail/:id',
    name: 'detail',
    component: Detail,
}
```
- 调用 `this.$router.push` 进行params传参，使用name，前提需要在路由配置里设置过名称。
```javascript
this.$router.push({
    name: 'detail',
    params: {
        id: '2019'
    }
})
```
- params接收参数
```javascript
const { id } = this.$route.params
```
query通常与path使用。query带查询参数，params路径参数。如果提供了path，params会被忽略。
```javascript
// params 不生效
router.push({ path: '/user', params: { userId }}) // -> /user
```

### 导航守卫

`导航` 表示路由正在发生变化，`vue-router` 提供的导航守卫主要用来通过跳转或者取消的方式守卫导航。导航守卫分为三种：全局守卫、单个路由守卫和组件内的守卫。

![导航守卫](https://user-gold-cdn.xitu.io/2019/11/28/16eb17340fe94220?w=831&h=272&f=jpeg&s=51593)

全局守卫：
- 全局前置守卫 beforeEach (to, from, next)
- 全局解析守卫 beforeResolve (to, from, next)
- 全局后置钩子 afterEach (to, from)

单个路由守卫：
- 路由前置守卫 beforeEnter (to, from, next)
 
组件内的守卫：
- 渲染组件的对应路由被confirm前 beforeRouterEnter (to, from, next) next可以是函数，因为该守卫不能获取组件实例，新组件还没被创建
- 路由改变，该组件被复用时调用 (to, from, next)
- 导航离开该组件对应路由时调用 beforeRouteLeave



##### 完整的导航解析流程图

![导航解析流程](https://user-gold-cdn.xitu.io/2019/11/28/16eb17802f55a752?w=876&h=639&f=jpeg&s=113367)

1. 导航被触发
2. 在失活的组件里调用离开守卫 `beforeRouteLeave`
3. 调用全局的 `beforeEach` 守卫
4. 在重用的组件里调用 `beforeRouteUpdate` 守卫（2.2+）
5. 在路由配置里调用 `beforeEnter`
6. 解析异步路由组件 
7. 在被激活的组件里调用 `beforeRouteEnter`
8. 调用全局的 `beforeResolve`守卫
9. 导航被确认
10. 调用全局的 `afterEach`钩子
11. 触发DOM更新
12. 用创建好的实例调用 `beforeRouterEnter` 守卫中传给next的回调函数