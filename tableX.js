/*
* 作者： videring
* 说明： 1.支持OptionGroup 2.option上需要传入data，存储原数据 3.select-x上要传入idKey，设置唯一标识符 3.基于第二、三点，组件实现了回显 4.iview Select功能保持不变
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
    render (h) {
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
        const props = {
            ...this.$props,
            ...this.$attrs,
            value: this.value.map(v => v[uid]) // 关键
        }
        const listeners = Object.fromEntries(Object.entries(this.$listeners).filter(e => !['input', 'on-change', 'on-open-change'].includes(e[0])))
        return h('Select', {
            on: {
                ...listeners,
                'on-change': (params) => {
                    if (params.length) {
                        let res = []
                        if (Object.prototype.toString.apply(params[0]) === '[object Object]') {
                            res = params.map(param => allOptions.find(v => v[uid] === param.value)).filter(Boolean)
                        } else {
                            res = params.map(param => allOptions.find(v => v[uid] === param)).filter(Boolean)
                        }
                        this.$emit('on-change', res)
                        this.$emit('input', res)
                    } else {
                        this.$emit('on-change', params)
                        this.$emit('input', params)
                    }
                },
                'input': (params) => {
                    let res = params.map(param => allOptions.find(v => v[uid] === param)).filter(Boolean)
                    if (params.length) {
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
