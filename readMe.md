iview Select 设置可多选时，v-model的变量对应的是数组，但是该数组的元素不能是对象形式，只能是数字或字符串等类型；
本篇正是为了解决这一问题，探讨几种方案。
# iview Option源码
```
<template>
    <li
            :class="classes"
            @click.stop="select"
            @mousedown.prevent
    ><slot>{{ showLabel }}</slot></li>
</template>
<script>
    import Emitter from '../../mixins/emitter';
    import { findComponentUpward } from '../../utils/assist';

    const prefixCls = 'ivu-select-item';

    export default {
        name: 'option-ex',
        componentName: 'select-item',
        mixins: [ Emitter ],
        props: {
            value: {
                type: [String, Number],
                required: true
            },
...
</script>
```
从源码中可以看出value被限定类型了，无法传入Object类型
# 解决办法
- 封装Select
```
<template>
    <Select 
            v-model="newValue"
            @on-change="handleChange">
        <Option>
            {{}}
        </Option>
    </Select>
</template>
<script>
    export default {
		methods: {
            handleChange(data){
                let arr = []
				// 对data进行拦截处理，输出结果不再是iview Select的格式，根据key获取到原数据，传入input，change事件中
                this.$emit('input',arr);
                this.$emit('change',arr);
            }
	}
</script>
```

- 重写Option（不建议）
复制Option源码到重写的组件中，同时把value的类型增加一个Object即可；
麻烦的地方在于两点：
a. js代码中Emitter,findComponentUpward的引入路径改为iview源码路径
b.componentName必须保持不变，因为父组件Select中会据此判断
c.无法呈现勾选状态，这是因为父组件Select的processOption方法中是用includes判断是否选中，includes不能用于元素是对象的数组：
```
// iview select.vue
processOption(option, values, isFocused){
              if (!option.componentOptions) return option;
                ...
                const isSelected = values.includes(optionValue);

                const propsData = {
                    ...option.componentOptions.propsData,
                    selected: isSelected,
                    ...
                };

                return {
                    ...option,
                    componentOptions: {
                        ...option.componentOptions,
                        propsData: propsData
                    }
                };
},
```
- HOC（高阶）方式
> 支持iview Select OptionGroup 
> option上需要传入data，存储原数据 
> select-x上要传入idKey，设置唯一标识符 
> 基于第二、三点，组件实现了回显
> iview Select功能保持不变

**效果**
https://codesandbox.io/embed/vue-template-y1ms4
**selectX.js在iview Select基础上进行封装**
```
// selectX.js
/*
 * iview Select 设置可多选时，v-model的变量对应的是数组，但是该数组的元素不能是对象形式，只能是数字或字符串等类型；
*/
export default {
  props: {
    value: {
      type: [String, Number, Array],
      default: ''
    },
    idKey: {
      type: String,
      default: 'id'
    },
  },
  name: 'select-x',
  render(h) {
    const uid = this.idKey || 'id'
    const slots = Object.keys(this.$slots)
      .reduce((arr, key) => arr.concat(this.$slots[key]), [])
      .map(vnode => {
        vnode.context = this._self
        return vnode
      })
    const optionGroup = slots.filter(slot => slot.componentOptions && slot.componentOptions.tag === 'OptionGroup').map(slot => slot.componentOptions.children).flat()
    const optionNoneGroup = slots.filter(slot => slot.componentOptions && slot.componentOptions.tag === 'Option')
    const allOldOptions = this.allOldOptions || []
    const allOptions = optionGroup.concat(optionNoneGroup).map(child => child.data.attrs.data).filter(Boolean)
    const allOptionIds = allOptions.map(option => option[uid]).filter(Boolean)
    this.allOldOptions = (allOptions.push(...allOldOptions.filter(option => !allOptionIds.includes(option.id))) && allOptions)
    // 特殊情况处理
    const isArrayFlag = Array.isArray(this.value)
    let ArrayContainsObject = isArrayFlag ? this.value.some(v => Object.prototype.toString.apply(v) === '[object Object]') : false
    let props = {
      ...this.$props,
      ...this.$attrs,
      value: ArrayContainsObject ? this.value.map(v => v[uid]) : this.value // 关键 支持字符串或数字
    }
    const isMultiple = ['', true].includes(this.$attrs.multiple) || !!this.$attrs.multiple
    /*
     * 如果v-model传入值不是数组，但组件已被设置成多选的话
     */
    if (isMultiple && !isArrayFlag) {
      let values = [this.value]
      ArrayContainsObject = isArrayFlag ? values.some(v => Object.prototype.toString.apply(v) === '[object Object]') : false
      props = {
        ...this.$props,
        ...this.$attrs,
        value: ArrayContainsObject ? values.map(v => v[uid]) : values // 关键 支持字符串或数字
      }
    }
    /*
     * 如果v-model传入值为数组，则无论是否设置多选，都强制设置成多选
     */
    if (isArrayFlag) {
      this.$attrs.multiple = props.multiple = true
    }

    const listeners = Object.fromEntries(Object.entries(this.$listeners).filter(e => !['input', 'on-change', 'on-open-change'].includes(e[0])))
    return h('Select', {
      on: {
        ...listeners,
        'on-change': (params) => {
          if (Array.isArray(params) && params.length) {
            let res = []
            if (Object.prototype.toString.apply(params[0]) === '[object Object]') {
              res = ArrayContainsObject
                ? params.map(param => allOptions.find(v => v[uid] === param.value)).filter(Boolean)
                : params.map(param => param.value)
            } else {
              res = ArrayContainsObject
                ? params.map(param => allOptions.find(v => v[uid] === param)).filter(Boolean)
                : params
            }
            this.$emit('on-change', res)
            this.$emit('input', res)
          } else {
            this.$emit('on-change', params)
            this.$emit('input', params)
          }
        },
        'input': (params) => {
          let res = Array.isArray(params)
            ? params.map(param => allOptions.find(v => v[uid] === param)).filter(Boolean)
            : params
          if (Array.isArray(params) && params.length) {
            this.$emit('input', res)
            this.$emit('on-change', res)
          } else {
            this.$emit('input', res)
            this.$emit('on-change', res)
          }
        },
        'on-open-change': (params) => {
          this.$emit('on-open-change', params)
        }
      },
      props,
      // 透传 scopedSlots
      scopedSlots: this.$scopedSlots,
      // attrs: this.$attrs
    }, slots)
  }
}
```
**使用方法**
```
<template>
  <div id="app">
    <select-x
      id-key="uid"
      v-model="modelData"
      filterable
      multiple
      :loading="selectConfig.loading"
      :loading-text="selectConfig.loadingText"
      :not-found-text="selectConfig.notFoundText"
      placeholder="请点击此处"
      @on-open-change="handleOpenChange"
    >
      <Option
        v-for="opt in (list || modelData)"
        :key="opt.uid"
        :value="opt.uid"
        :data="opt"
      >{{opt.label}}</Option>
    </select-x>
    已选城市：
    <ul>
      <li v-for="(item, index) of modelData" :key="index">{{item.label}}</li>
    </ul>
  </div>
</template>

<script>
import selectX from "./components/selectX";

export default {
  name: "App",
  components: {
    selectX
  },
  data() {
    return {
      modelData: [{ uid: 11, label: "西安" }, { uid: 12, label: "北京" }], // 回显的值
      list: null,
      selectConfig: {
        loading: false,
        loadingText: "正在查询中",
        notFoundText: ""
      }
    };
  },
  methods: {
    handleOpenChange(bl) {
      // this.$Message.success('打开：', bl)
      this.selectConfig = {
        loading: true,
        loadingText: "正在查询",
        notFoundText: ""
      };
      let self = this;
      setTimeout(() => {
        self.list = [
          { uid: 11, label: "西安" },
          { uid: 12, label: "北京" },
          { uid: 13, label: "南京" },
          { uid: 14, label: "洛阳" },
          { uid: 15, label: "武昌" }
        ];
        console.log("---");
        self.selectConfig = {
          loading: false,
          loadingText: "",
          notFoundText: ""
        };
      }, 2000);
    },
    mounted() {
      console.log("mounted!!!");
    }
  }
};
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

```
