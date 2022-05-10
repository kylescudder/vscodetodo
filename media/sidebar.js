var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const apiBaseUrl$1 = `https://resonant-acute-ranunculus.glitch.me/VSCodeToDo`;

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var dayjs_min = {exports: {}};

    (function (module, exports) {
    !function(t,e){module.exports=e();}(commonjsGlobal,(function(){var t=1e3,e=6e4,n=36e5,r="millisecond",i="second",s="minute",u="hour",a="day",o="week",f="month",h="quarter",c="year",d="date",$="Invalid Date",l=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,y=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,M={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_")},m=function(t,e,n){var r=String(t);return !r||r.length>=e?t:""+Array(e+1-r.length).join(n)+t},g={s:m,z:function(t){var e=-t.utcOffset(),n=Math.abs(e),r=Math.floor(n/60),i=n%60;return (e<=0?"+":"-")+m(r,2,"0")+":"+m(i,2,"0")},m:function t(e,n){if(e.date()<n.date())return -t(n,e);var r=12*(n.year()-e.year())+(n.month()-e.month()),i=e.clone().add(r,f),s=n-i<0,u=e.clone().add(r+(s?-1:1),f);return +(-(r+(n-i)/(s?i-u:u-i))||0)},a:function(t){return t<0?Math.ceil(t)||0:Math.floor(t)},p:function(t){return {M:f,y:c,w:o,d:a,D:d,h:u,m:s,s:i,ms:r,Q:h}[t]||String(t||"").toLowerCase().replace(/s$/,"")},u:function(t){return void 0===t}},v="en",D={};D[v]=M;var p=function(t){return t instanceof _},S=function t(e,n,r){var i;if(!e)return v;if("string"==typeof e){var s=e.toLowerCase();D[s]&&(i=s),n&&(D[s]=n,i=s);var u=e.split("-");if(!i&&u.length>1)return t(u[0])}else {var a=e.name;D[a]=e,i=a;}return !r&&i&&(v=i),i||!r&&v},w=function(t,e){if(p(t))return t.clone();var n="object"==typeof e?e:{};return n.date=t,n.args=arguments,new _(n)},O=g;O.l=S,O.i=p,O.w=function(t,e){return w(t,{locale:e.$L,utc:e.$u,x:e.$x,$offset:e.$offset})};var _=function(){function M(t){this.$L=S(t.locale,null,!0),this.parse(t);}var m=M.prototype;return m.parse=function(t){this.$d=function(t){var e=t.date,n=t.utc;if(null===e)return new Date(NaN);if(O.u(e))return new Date;if(e instanceof Date)return new Date(e);if("string"==typeof e&&!/Z$/i.test(e)){var r=e.match(l);if(r){var i=r[2]-1||0,s=(r[7]||"0").substring(0,3);return n?new Date(Date.UTC(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)):new Date(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)}}return new Date(e)}(t),this.$x=t.x||{},this.init();},m.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds();},m.$utils=function(){return O},m.isValid=function(){return !(this.$d.toString()===$)},m.isSame=function(t,e){var n=w(t);return this.startOf(e)<=n&&n<=this.endOf(e)},m.isAfter=function(t,e){return w(t)<this.startOf(e)},m.isBefore=function(t,e){return this.endOf(e)<w(t)},m.$g=function(t,e,n){return O.u(t)?this[e]:this.set(n,t)},m.unix=function(){return Math.floor(this.valueOf()/1e3)},m.valueOf=function(){return this.$d.getTime()},m.startOf=function(t,e){var n=this,r=!!O.u(e)||e,h=O.p(t),$=function(t,e){var i=O.w(n.$u?Date.UTC(n.$y,e,t):new Date(n.$y,e,t),n);return r?i:i.endOf(a)},l=function(t,e){return O.w(n.toDate()[t].apply(n.toDate("s"),(r?[0,0,0,0]:[23,59,59,999]).slice(e)),n)},y=this.$W,M=this.$M,m=this.$D,g="set"+(this.$u?"UTC":"");switch(h){case c:return r?$(1,0):$(31,11);case f:return r?$(1,M):$(0,M+1);case o:var v=this.$locale().weekStart||0,D=(y<v?y+7:y)-v;return $(r?m-D:m+(6-D),M);case a:case d:return l(g+"Hours",0);case u:return l(g+"Minutes",1);case s:return l(g+"Seconds",2);case i:return l(g+"Milliseconds",3);default:return this.clone()}},m.endOf=function(t){return this.startOf(t,!1)},m.$set=function(t,e){var n,o=O.p(t),h="set"+(this.$u?"UTC":""),$=(n={},n[a]=h+"Date",n[d]=h+"Date",n[f]=h+"Month",n[c]=h+"FullYear",n[u]=h+"Hours",n[s]=h+"Minutes",n[i]=h+"Seconds",n[r]=h+"Milliseconds",n)[o],l=o===a?this.$D+(e-this.$W):e;if(o===f||o===c){var y=this.clone().set(d,1);y.$d[$](l),y.init(),this.$d=y.set(d,Math.min(this.$D,y.daysInMonth())).$d;}else $&&this.$d[$](l);return this.init(),this},m.set=function(t,e){return this.clone().$set(t,e)},m.get=function(t){return this[O.p(t)]()},m.add=function(r,h){var d,$=this;r=Number(r);var l=O.p(h),y=function(t){var e=w($);return O.w(e.date(e.date()+Math.round(t*r)),$)};if(l===f)return this.set(f,this.$M+r);if(l===c)return this.set(c,this.$y+r);if(l===a)return y(1);if(l===o)return y(7);var M=(d={},d[s]=e,d[u]=n,d[i]=t,d)[l]||1,m=this.$d.getTime()+r*M;return O.w(m,this)},m.subtract=function(t,e){return this.add(-1*t,e)},m.format=function(t){var e=this,n=this.$locale();if(!this.isValid())return n.invalidDate||$;var r=t||"YYYY-MM-DDTHH:mm:ssZ",i=O.z(this),s=this.$H,u=this.$m,a=this.$M,o=n.weekdays,f=n.months,h=function(t,n,i,s){return t&&(t[n]||t(e,r))||i[n].slice(0,s)},c=function(t){return O.s(s%12||12,t,"0")},d=n.meridiem||function(t,e,n){var r=t<12?"AM":"PM";return n?r.toLowerCase():r},l={YY:String(this.$y).slice(-2),YYYY:this.$y,M:a+1,MM:O.s(a+1,2,"0"),MMM:h(n.monthsShort,a,f,3),MMMM:h(f,a),D:this.$D,DD:O.s(this.$D,2,"0"),d:String(this.$W),dd:h(n.weekdaysMin,this.$W,o,2),ddd:h(n.weekdaysShort,this.$W,o,3),dddd:o[this.$W],H:String(s),HH:O.s(s,2,"0"),h:c(1),hh:c(2),a:d(s,u,!0),A:d(s,u,!1),m:String(u),mm:O.s(u,2,"0"),s:String(this.$s),ss:O.s(this.$s,2,"0"),SSS:O.s(this.$ms,3,"0"),Z:i};return r.replace(y,(function(t,e){return e||l[t]||i.replace(":","")}))},m.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},m.diff=function(r,d,$){var l,y=O.p(d),M=w(r),m=(M.utcOffset()-this.utcOffset())*e,g=this-M,v=O.m(this,M);return v=(l={},l[c]=v/12,l[f]=v,l[h]=v/3,l[o]=(g-m)/6048e5,l[a]=(g-m)/864e5,l[u]=g/n,l[s]=g/e,l[i]=g/t,l)[y]||g,$?v:O.a(v)},m.daysInMonth=function(){return this.endOf(f).$D},m.$locale=function(){return D[this.$L]},m.locale=function(t,e){if(!t)return this.$L;var n=this.clone(),r=S(t,e,!0);return r&&(n.$L=r),n},m.clone=function(){return O.w(this.$d,this)},m.toDate=function(){return new Date(this.valueOf())},m.toJSON=function(){return this.isValid()?this.toISOString():null},m.toISOString=function(){return this.$d.toISOString()},m.toString=function(){return this.$d.toUTCString()},M}(),T=_.prototype;return w.prototype=T,[["$ms",r],["$s",i],["$m",s],["$H",u],["$W",a],["$M",f],["$y",c],["$D",d]].forEach((function(t){T[t[1]]=function(e){return this.$g(e,t[0],t[1])};})),w.extend=function(t,e){return t.$i||(t(e,_,w),t.$i=!0),w},w.locale=S,w.isDayjs=p,w.unix=function(t){return w(1e3*t)},w.en=D[v],w.Ls=D,w.p={},w}));
    }(dayjs_min));

    var dayjs = dayjs_min.exports;

    /* webviews\components\ToDos.svelte generated by Svelte v3.46.4 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[26] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (175:4) {#each categories as category}
    function create_each_block_2(ctx) {
    	let option;
    	let t0_value = /*category*/ ctx[23].text + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*category*/ ctx[23].id;
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t0);
    			append(option, t1);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*categories*/ 128 && t0_value !== (t0_value = /*category*/ ctx[23].text + "")) set_data(t0, t0_value);

    			if (dirty & /*categories*/ 128 && option_value_value !== (option_value_value = /*category*/ ctx[23].id)) {
    				option.__value = option_value_value;
    				option.value = option.__value;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (204:8) {#if category.id === todo.categoryId}
    function create_if_block$1(ctx) {
    	let article;
    	let span2;
    	let span0;
    	let t0_value = /*todo*/ ctx[26].text + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2_value = /*todo*/ ctx[26].targetDateString + "";
    	let t2;
    	let t3;
    	let span3;
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*todo*/ ctx[26].completed) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			article = element("article");
    			span2 = element("span");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span3 = element("span");
    			if_block.c();
    			t4 = space();
    			attr(span0, "class", "todoText col-span-2");
    			attr(span1, "class", "col-span-2");
    			attr(span2, "class", "col-span-5 grid grid-cols-4");
    			toggle_class(span2, "completed", /*todo*/ ctx[26].completed);
    			toggle_class(span2, "uncompleted", !/*todo*/ ctx[26].completed);
    			attr(span3, "class", "todoImg col-span-1");
    			attr(article, "class", "todoArticle pt-2 text-base grid grid-cols-6");
    		},
    		m(target, anchor) {
    			insert(target, article, anchor);
    			append(article, span2);
    			append(span2, span0);
    			append(span0, t0);
    			append(span2, t1);
    			append(span2, span1);
    			append(span1, t2);
    			append(article, t3);
    			append(article, span3);
    			if_block.m(span3, null);
    			append(article, t4);

    			if (!mounted) {
    				dispose = listen(article, "click", function () {
    					if (is_function(/*clickToDo*/ ctx[10](/*todo*/ ctx[26]))) /*clickToDo*/ ctx[10](/*todo*/ ctx[26]).apply(this, arguments);
    				});

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*todos*/ 16 && t0_value !== (t0_value = /*todo*/ ctx[26].text + "")) set_data(t0, t0_value);
    			if (dirty & /*todos*/ 16 && t2_value !== (t2_value = /*todo*/ ctx[26].targetDateString + "")) set_data(t2, t2_value);

    			if (dirty & /*todos*/ 16) {
    				toggle_class(span2, "completed", /*todo*/ ctx[26].completed);
    			}

    			if (dirty & /*todos*/ 16) {
    				toggle_class(span2, "uncompleted", !/*todo*/ ctx[26].completed);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span3, null);
    				}
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(article);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (223:14) {:else}
    function create_else_block$1(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fa-regular fa-circle-check ml-3 checkedIcon text-2xl");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (221:14) {#if todo.completed}
    function create_if_block_1$1(ctx) {
    	let i;

    	return {
    		c() {
    			i = element("i");
    			attr(i, "class", "fa-solid fa-circle-check ml-3 checkedIcon text-2xl");
    		},
    		m(target, anchor) {
    			insert(target, i, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(i);
    		}
    	};
    }

    // (203:6) {#each todos as todo (todo.id)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let if_block_anchor;
    	let if_block = /*category*/ ctx[23].id === /*todo*/ ctx[26].categoryId && create_if_block$1(ctx);

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			first = empty();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			this.first = first;
    		},
    		m(target, anchor) {
    			insert(target, first, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*category*/ ctx[23].id === /*todo*/ ctx[26].categoryId) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(first);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (197:0) {#each categories as category (category.id)}
    function create_each_block(key_1, ctx) {
    	let section;
    	let h2;
    	let t0_value = /*category*/ ctx[23].text + "";
    	let t0;
    	let i;
    	let t1;
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t2;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*todos*/ ctx[4];
    	const get_key = ctx => /*todo*/ ctx[26].id;

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			section = element("section");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			i = element("i");
    			t1 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr(i, "class", "fa-solid fa-arrow-right pl-2");
    			attr(h2, "class", "categoryHeader text-2xl");
    			attr(div, "class", "panel");
    			attr(section, "class", "card");
    			this.first = section;
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, h2);
    			append(h2, t0);
    			append(h2, i);
    			append(section, t1);
    			append(section, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(section, t2);

    			if (!mounted) {
    				dispose = listen(h2, "click", /*click_handler_1*/ ctx[20]);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*categories*/ 128 && t0_value !== (t0_value = /*category*/ ctx[23].text + "")) set_data(t0, t0_value);

    			if (dirty & /*clickToDo, todos, categories*/ 1168) {
    				each_value_1 = /*todos*/ ctx[4];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, div, destroy_block, create_each_block_1, null, get_each_context_1);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(section);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let span;
    	let p0;
    	let t0;
    	let t1_value = /*user*/ ctx[0].name + "";
    	let t1;
    	let t2;
    	let i;
    	let t3;
    	let form0;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let select;
    	let t6;
    	let button;
    	let t8;
    	let form1;
    	let p1;
    	let t10;
    	let input2;
    	let t11;
    	let p2;
    	let t13;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let each1_anchor;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*categories*/ ctx[7];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value = /*categories*/ ctx[7];
    	const get_key = ctx => /*category*/ ctx[23].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			span = element("span");
    			p0 = element("p");
    			t0 = text("Hello ");
    			t1 = text(t1_value);
    			t2 = space();
    			i = element("i");
    			t3 = space();
    			form0 = element("form");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t6 = space();
    			button = element("button");
    			button.textContent = "Add";
    			t8 = space();
    			form1 = element("form");
    			p1 = element("p");
    			p1.textContent = "Add Category";
    			t10 = space();
    			input2 = element("input");
    			t11 = space();
    			p2 = element("p");
    			p2.textContent = "To Do List";
    			t13 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			attr(p0, "class", "text-lg col-span-3");
    			attr(i, "class", "fa-solid fa-arrow-rotate-right col-span-1 text-lg float-right");
    			attr(span, "class", "grid grid-cols-4");
    			attr(input0, "placeholder", "Add this todo");
    			attr(input1, "type", "datetime-local");
    			attr(input1, "placeholder", "Add target date");
    			attr(select, "class", "fieldInput categoryDropdown");
    			if (/*selected*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[15].call(select));
    			attr(button, "type", "submit");
    			attr(p1, "class", "text-lg");
    			attr(input2, "placeholder", "Add category");
    			attr(form1, "class", "mt-4 mb-8");
    			attr(p2, "class", "text-lg");
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, p0);
    			append(p0, t0);
    			append(p0, t1);
    			append(span, t2);
    			append(span, i);
    			insert(target, t3, anchor);
    			insert(target, form0, anchor);
    			append(form0, input0);
    			set_input_value(input0, /*text*/ ctx[1]);
    			append(form0, t4);
    			append(form0, input1);
    			set_input_value(input1, /*targetDate*/ ctx[2]);
    			append(form0, t5);
    			append(form0, select);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select, null);
    			}

    			select_option(select, /*selected*/ ctx[5]);
    			append(form0, t6);
    			append(form0, button);
    			insert(target, t8, anchor);
    			insert(target, form1, anchor);
    			append(form1, p1);
    			append(form1, t10);
    			append(form1, input2);
    			set_input_value(input2, /*categoryText*/ ctx[3]);
    			insert(target, t11, anchor);
    			insert(target, p2, anchor);
    			insert(target, t13, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(i, "click", /*click_handler*/ ctx[12]),
    					listen(input0, "input", /*input0_input_handler*/ ctx[13]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[14]),
    					listen(select, "change", /*select_change_handler*/ ctx[15]),
    					listen(select, "blur", /*blur_handler*/ ctx[16]),
    					listen(form0, "submit", prevent_default(/*submit_handler*/ ctx[17])),
    					listen(input2, "input", /*input2_input_handler*/ ctx[18]),
    					listen(form1, "submit", prevent_default(/*submit_handler_1*/ ctx[19]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*user*/ 1 && t1_value !== (t1_value = /*user*/ ctx[0].name + "")) set_data(t1, t1_value);

    			if (dirty & /*text*/ 2 && input0.value !== /*text*/ ctx[1]) {
    				set_input_value(input0, /*text*/ ctx[1]);
    			}

    			if (dirty & /*targetDate*/ 4) {
    				set_input_value(input1, /*targetDate*/ ctx[2]);
    			}

    			if (dirty & /*categories*/ 128) {
    				each_value_2 = /*categories*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty & /*selected, categories*/ 160) {
    				select_option(select, /*selected*/ ctx[5]);
    			}

    			if (dirty & /*categoryText*/ 8 && input2.value !== /*categoryText*/ ctx[3]) {
    				set_input_value(input2, /*categoryText*/ ctx[3]);
    			}

    			if (dirty & /*todos, clickToDo, categories, categoryHide*/ 1168) {
    				each_value = /*categories*/ ctx[7];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, destroy_block, create_each_block, each1_anchor, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    			if (detaching) detach(t3);
    			if (detaching) detach(form0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t8);
    			if (detaching) detach(form1);
    			if (detaching) detach(t11);
    			if (detaching) detach(p2);
    			if (detaching) detach(t13);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach(each1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function categoryHide(event) {
    	let target = event.target;

    	if (event.target.localName === 'i') {
    		target = event.target.parentElement;
    	}

    	if (target.nextElementSibling.style.maxHeight) {
    		target.nextElementSibling.style.maxHeight = null;
    		target.firstElementChild.classList.remove("expandedIcon");
    	} else {
    		target.nextElementSibling.style.maxHeight = target.nextElementSibling.scrollHeight + "px";
    		target.firstElementChild.classList.add("expandedIcon");
    	}
    }

    function hideEmptyCategories() {
    	var arr = Array.from(document.getElementsByClassName("card"));

    	for (let i = 0; i < arr.length; i++) {
    		const element = arr[i];
    		const lists = element.children[1];

    		if (lists.childElementCount == 0) {
    			element.removeAttribute("style");
    			element.setAttribute("style", "display: none;");
    		} else {
    			element.removeAttribute("style");
    		}
    	}
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { user } = $$props;
    	let { accessToken } = $$props;
    	let text = "";
    	let targetDate = "";
    	let categoryText = "";
    	let todos = [];
    	let selected;
    	let answer = "";
    	let categories = [];

    	async function addToDo(t, targetDate, categoryId) {
    		await fetch(`${apiBaseUrl$1}/todo`, {
    			method: "POST",
    			body: JSON.stringify({ text: t, targetDate, categoryId }),
    			headers: {
    				"content-type": "application/json",
    				authorization: `Bearer ${accessToken}`
    			}
    		});

    		getToDo().then(() => {
    			
    		}).catch(() => {
    			console.log("Getting todos failed");
    		});

    		setTimeout(
    			function () {
    				hideEmptyCategories();
    			},
    			100
    		);
    	}

    	async function addCategory(t) {
    		await fetch(`${apiBaseUrl$1}/category`, {
    			method: 'POST',
    			body: JSON.stringify({ categoryText: t }),
    			headers: {
    				'content-type': 'application/json',
    				authorization: `Bearer ${accessToken}`
    			}
    		});

    		categoryPopulate().then(() => {
    			
    		}).catch(() => {
    			console.log('Getting todos failed');
    		});

    		setTimeout(
    			function () {
    				hideEmptyCategories();
    			},
    			100
    		);
    	}

    	async function getToDo() {
    		const response = await fetch(`${apiBaseUrl$1}/todo`, {
    			headers: { authorization: `Bearer ${accessToken}` }
    		});

    		const payload = await response.json();
    		$$invalidate(4, todos = payload.data);

    		todos.forEach(todo => {
    			todo.targetDateString = dayjs(todo.targetDate).format('DD/MM/YYYY HH:mm');
    		});

    		categoryPopulate();
    		return todos;
    	}

    	onMount(async () => {
    		window.addEventListener("message", async event => {
    			const message = event.data; // The json data that the extension sent

    			switch (message.type) {
    				case "new-todo":
    					addToDo(message.value, '', selected);
    					break;
    			}
    		});

    		getToDo().then(() => {
    			
    		}).catch(() => {
    			console.log("Getting todos failed");
    		});

    		categoryPopulate();
    	});

    	async function categoryPopulate() {
    		const categoryResponse = await fetch(`${apiBaseUrl$1}/categories`, {
    			headers: { authorization: `Bearer ${accessToken}` }
    		});

    		const categoryPayload = await categoryResponse.json();
    		$$invalidate(7, categories = categoryPayload.payload);
    		$$invalidate(5, selected = categories[0].id);

    		setTimeout(
    			function () {
    				hideEmptyCategories();
    			},
    			100
    		);
    	}

    	async function clickToDo(todo) {
    		todo.completed = !todo.completed;

    		const response = await fetch(`${apiBaseUrl$1}/todo`, {
    			method: "PUT",
    			body: JSON.stringify({ id: todo.id }),
    			headers: {
    				"content-type": "application/json",
    				authorization: `Bearer ${accessToken}`
    			}
    		});

    		getToDo().then(() => {
    			
    		}).catch(() => {
    			console.log("Getting todos failed");
    		});

    		if (todo.completed) {
    			tsvscode.postMessage({
    				type: "onInfo",
    				value: todo.text + " completed! Well done 🥳"
    			});
    		}

    		const payload = await response.json();
    		$$invalidate(4, todos = payload.todos);
    	}

    	const click_handler = () => {
    		tsvscode.postMessage({ type: "refresh", value: undefined });
    	};

    	function input0_input_handler() {
    		text = this.value;
    		$$invalidate(1, text);
    	}

    	function input1_input_handler() {
    		targetDate = this.value;
    		$$invalidate(2, targetDate);
    	}

    	function select_change_handler() {
    		selected = select_value(this);
    		$$invalidate(5, selected);
    		$$invalidate(7, categories);
    	}

    	const blur_handler = () => $$invalidate(6, answer = "");

    	const submit_handler = async () => {
    		addToDo(text, targetDate, selected);
    		$$invalidate(1, text = "");
    		$$invalidate(2, targetDate = "");
    	};

    	function input2_input_handler() {
    		categoryText = this.value;
    		$$invalidate(3, categoryText);
    	}

    	const submit_handler_1 = async () => {
    		addCategory(categoryText);
    		$$invalidate(3, categoryText = "");
    	};

    	const click_handler_1 = event => categoryHide(event);

    	$$self.$$set = $$props => {
    		if ('user' in $$props) $$invalidate(0, user = $$props.user);
    		if ('accessToken' in $$props) $$invalidate(11, accessToken = $$props.accessToken);
    	};

    	return [
    		user,
    		text,
    		targetDate,
    		categoryText,
    		todos,
    		selected,
    		answer,
    		categories,
    		addToDo,
    		addCategory,
    		clickToDo,
    		accessToken,
    		click_handler,
    		input0_input_handler,
    		input1_input_handler,
    		select_change_handler,
    		blur_handler,
    		submit_handler,
    		input2_input_handler,
    		submit_handler_1,
    		click_handler_1
    	];
    }

    class ToDos extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { user: 0, accessToken: 11 });
    	}
    }

    /* webviews\components\sidebar.svelte generated by Svelte v3.46.4 */

    function create_else_block_1(ctx) {
    	let section;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			section = element("section");
    			button = element("button");
    			button.textContent = "Login with GitHub";
    			attr(section, "class", "fade-in");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_3*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(section);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (36:15) 
    function create_if_block_1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let t0;
    	let section;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block_2, create_else_block];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*page*/ ctx[0] === "todos") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			t0 = space();
    			section = element("section");
    			button = element("button");
    			button.textContent = "Logout";
    			attr(section, "class", "fade-in");
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, t0, anchor);
    			insert(target, section, anchor);
    			append(section, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_2*/ ctx[6]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(t0.parentNode, t0);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(section);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (34:0) {#if loading}
    function create_if_block(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "loading...";
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (46:2) {:else}
    function create_else_block(ctx) {
    	let section;
    	let div;
    	let t1;
    	let ol;
    	let t10;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			section = element("section");
    			div = element("div");
    			div.textContent = "Handy tips:";
    			t1 = space();
    			ol = element("ol");

    			ol.innerHTML = `<li><p>Before you can add any Things To Do, you need to create a category. 
            To create a category just type the name into the &#39;Add Category&#39; field press Enter
            This helps you keep yours Things To Do in manageable areas.</p></li> 
        <li><p>If you are on a deadline, you can add a target date/time. 
            When it is 60 minutes before the target date, it will turn yellow.
            When it is 30 minutes before the target date, it will turn orange.
            When the target date/time has passed, it will turn red.<br/>
            A target date/time is optional.</p></li> 
        <li><p>When the extension is initially loaded the categories are collapsed.
            To expand on a section click on the category name. To collapse it just click it the same.</p></li> 
        <li><p>To Do items are removed 30 days after being completed.</p></li>`;

    			t10 = space();
    			button = element("button");
    			button.textContent = "Go to my ThingsToDo";
    			attr(ol, "type", "1");
    			attr(button, "class", "buttonMargin");
    			attr(section, "class", "fade-in");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			append(section, div);
    			append(section, t1);
    			append(section, ol);
    			append(section, t10);
    			append(section, button);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler_1*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(section);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (37:2) {#if page === "todos"}
    function create_if_block_2(ctx) {
    	let section;
    	let todos;
    	let t0;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	todos = new ToDos({
    			props: {
    				user: /*user*/ ctx[3],
    				accessToken: /*accessToken*/ ctx[1]
    			}
    		});

    	return {
    		c() {
    			section = element("section");
    			create_component(todos.$$.fragment);
    			t0 = space();
    			button = element("button");
    			button.textContent = "What can I do with ThingsToDo?";
    			attr(button, "class", "buttonMargin");
    			attr(section, "class", "fade-in");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			mount_component(todos, section, null);
    			append(section, t0);
    			append(section, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			const todos_changes = {};
    			if (dirty & /*user*/ 8) todos_changes.user = /*user*/ ctx[3];
    			if (dirty & /*accessToken*/ 2) todos_changes.accessToken = /*accessToken*/ ctx[1];
    			todos.$set(todos_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(todos.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(todos.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			destroy_component(todos);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*loading*/ ctx[2]) return 0;
    		if (/*user*/ ctx[3]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			div = element("div");
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			insert(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (detaching) detach(t);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	var _a;
    	let accessToken = "";
    	let loading = true;
    	let user = null;

    	let page = ((_a = tsvscode.getState()) === null || _a === void 0
    	? void 0
    	: _a.page) || "todos";

    	onMount(async () => {
    		window.addEventListener("message", async event => {
    			const message = event.data; // The json data that the extension sent

    			switch (message.type) {
    				case "token":
    					$$invalidate(1, accessToken = message.value);
    					const response = await fetch(`${apiBaseUrl}/me`, {
    						headers: { authorization: `Bearer ${accessToken}` }
    					});
    					const data = await response.json();
    					$$invalidate(3, user = data.users);
    					$$invalidate(2, loading = false);
    					break;
    			}
    		});

    		tsvscode.postMessage({ type: "get-token", value: undefined });
    	});

    	const click_handler = () => {
    		$$invalidate(0, page = "rules");
    	};

    	const click_handler_1 = () => {
    		$$invalidate(0, page = "todos");
    	};

    	const click_handler_2 = () => {
    		$$invalidate(1, accessToken = "");
    		$$invalidate(3, user = null);
    		tsvscode.postMessage({ type: "logout", value: undefined });
    	};

    	const click_handler_3 = () => {
    		tsvscode.postMessage({ type: "authenticate", value: undefined });
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*page*/ 1) {
    			{
    				tsvscode.setState({ page });
    			}
    		}
    	};

    	return [
    		page,
    		accessToken,
    		loading,
    		user,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class Sidebar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new Sidebar({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=sidebar.js.map
