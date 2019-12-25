
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty) {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return lets;
        }
        return $$scope.dirty;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
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
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
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
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
            $$.dirty = [-1];
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

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const user = writable('');

    var strictUriEncode = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

    var token = '%[a-f0-9]{2}';
    var singleMatcher = new RegExp(token, 'gi');
    var multiMatcher = new RegExp('(' + token + ')+', 'gi');

    function decodeComponents(components, split) {
    	try {
    		// Try to decode the entire string first
    		return decodeURIComponent(components.join(''));
    	} catch (err) {
    		// Do nothing
    	}

    	if (components.length === 1) {
    		return components;
    	}

    	split = split || 1;

    	// Split the array in 2 parts
    	var left = components.slice(0, split);
    	var right = components.slice(split);

    	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
    }

    function decode(input) {
    	try {
    		return decodeURIComponent(input);
    	} catch (err) {
    		var tokens = input.match(singleMatcher);

    		for (var i = 1; i < tokens.length; i++) {
    			input = decodeComponents(tokens, i).join('');

    			tokens = input.match(singleMatcher);
    		}

    		return input;
    	}
    }

    function customDecodeURIComponent(input) {
    	// Keep track of all the replacements and prefill the map with the `BOM`
    	var replaceMap = {
    		'%FE%FF': '\uFFFD\uFFFD',
    		'%FF%FE': '\uFFFD\uFFFD'
    	};

    	var match = multiMatcher.exec(input);
    	while (match) {
    		try {
    			// Decode as big chunks as possible
    			replaceMap[match[0]] = decodeURIComponent(match[0]);
    		} catch (err) {
    			var result = decode(match[0]);

    			if (result !== match[0]) {
    				replaceMap[match[0]] = result;
    			}
    		}

    		match = multiMatcher.exec(input);
    	}

    	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
    	replaceMap['%C2'] = '\uFFFD';

    	var entries = Object.keys(replaceMap);

    	for (var i = 0; i < entries.length; i++) {
    		// Replace all decoded components
    		var key = entries[i];
    		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
    	}

    	return input;
    }

    var decodeUriComponent = function (encodedURI) {
    	if (typeof encodedURI !== 'string') {
    		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
    	}

    	try {
    		encodedURI = encodedURI.replace(/\+/g, ' ');

    		// Try the built in decoder first
    		return decodeURIComponent(encodedURI);
    	} catch (err) {
    		// Fallback to a more advanced decoder
    		return customDecodeURIComponent(encodedURI);
    	}
    };

    var splitOnFirst = (string, separator) => {
    	if (!(typeof string === 'string' && typeof separator === 'string')) {
    		throw new TypeError('Expected the arguments to be of type `string`');
    	}

    	if (separator === '') {
    		return [string];
    	}

    	const separatorIndex = string.indexOf(separator);

    	if (separatorIndex === -1) {
    		return [string];
    	}

    	return [
    		string.slice(0, separatorIndex),
    		string.slice(separatorIndex + separator.length)
    	];
    };

    function encoderForArrayFormat(options) {
    	switch (options.arrayFormat) {
    		case 'index':
    			return key => (result, value) => {
    				const index = result.length;
    				if (value === undefined || (options.skipNull && value === null)) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, [encode(key, options), '[', index, ']'].join('')];
    				}

    				return [
    					...result,
    					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
    				];
    			};

    		case 'bracket':
    			return key => (result, value) => {
    				if (value === undefined || (options.skipNull && value === null)) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, [encode(key, options), '[]'].join('')];
    				}

    				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
    			};

    		case 'comma':
    			return key => (result, value) => {
    				if (value === null || value === undefined || value.length === 0) {
    					return result;
    				}

    				if (result.length === 0) {
    					return [[encode(key, options), '=', encode(value, options)].join('')];
    				}

    				return [[result, encode(value, options)].join(',')];
    			};

    		default:
    			return key => (result, value) => {
    				if (value === undefined || (options.skipNull && value === null)) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, encode(key, options)];
    				}

    				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
    			};
    	}
    }

    function parserForArrayFormat(options) {
    	let result;

    	switch (options.arrayFormat) {
    		case 'index':
    			return (key, value, accumulator) => {
    				result = /\[(\d*)\]$/.exec(key);

    				key = key.replace(/\[\d*\]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = {};
    				}

    				accumulator[key][result[1]] = value;
    			};

    		case 'bracket':
    			return (key, value, accumulator) => {
    				result = /(\[\])$/.exec(key);
    				key = key.replace(/\[\]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = [value];
    					return;
    				}

    				accumulator[key] = [].concat(accumulator[key], value);
    			};

    		case 'comma':
    			return (key, value, accumulator) => {
    				const isArray = typeof value === 'string' && value.split('').indexOf(',') > -1;
    				const newValue = isArray ? value.split(',') : value;
    				accumulator[key] = newValue;
    			};

    		default:
    			return (key, value, accumulator) => {
    				if (accumulator[key] === undefined) {
    					accumulator[key] = value;
    					return;
    				}

    				accumulator[key] = [].concat(accumulator[key], value);
    			};
    	}
    }

    function encode(value, options) {
    	if (options.encode) {
    		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
    	}

    	return value;
    }

    function decode$1(value, options) {
    	if (options.decode) {
    		return decodeUriComponent(value);
    	}

    	return value;
    }

    function keysSorter(input) {
    	if (Array.isArray(input)) {
    		return input.sort();
    	}

    	if (typeof input === 'object') {
    		return keysSorter(Object.keys(input))
    			.sort((a, b) => Number(a) - Number(b))
    			.map(key => input[key]);
    	}

    	return input;
    }

    function removeHash(input) {
    	const hashStart = input.indexOf('#');
    	if (hashStart !== -1) {
    		input = input.slice(0, hashStart);
    	}

    	return input;
    }

    function extract(input) {
    	input = removeHash(input);
    	const queryStart = input.indexOf('?');
    	if (queryStart === -1) {
    		return '';
    	}

    	return input.slice(queryStart + 1);
    }

    function parseValue(value, options) {
    	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
    		value = Number(value);
    	} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
    		value = value.toLowerCase() === 'true';
    	}

    	return value;
    }

    function parse(input, options) {
    	options = Object.assign({
    		decode: true,
    		sort: true,
    		arrayFormat: 'none',
    		parseNumbers: false,
    		parseBooleans: false
    	}, options);

    	const formatter = parserForArrayFormat(options);

    	// Create an object with no prototype
    	const ret = Object.create(null);

    	if (typeof input !== 'string') {
    		return ret;
    	}

    	input = input.trim().replace(/^[?#&]/, '');

    	if (!input) {
    		return ret;
    	}

    	for (const param of input.split('&')) {
    		let [key, value] = splitOnFirst(options.decode ? param.replace(/\+/g, ' ') : param, '=');

    		// Missing `=` should be `null`:
    		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
    		value = value === undefined ? null : decode$1(value, options);
    		formatter(decode$1(key, options), value, ret);
    	}

    	for (const key of Object.keys(ret)) {
    		const value = ret[key];
    		if (typeof value === 'object' && value !== null) {
    			for (const k of Object.keys(value)) {
    				value[k] = parseValue(value[k], options);
    			}
    		} else {
    			ret[key] = parseValue(value, options);
    		}
    	}

    	if (options.sort === false) {
    		return ret;
    	}

    	return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
    		const value = ret[key];
    		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
    			// Sort object keys, not values
    			result[key] = keysSorter(value);
    		} else {
    			result[key] = value;
    		}

    		return result;
    	}, Object.create(null));
    }

    var extract_1 = extract;
    var parse_1 = parse;

    var stringify = (object, options) => {
    	if (!object) {
    		return '';
    	}

    	options = Object.assign({
    		encode: true,
    		strict: true,
    		arrayFormat: 'none'
    	}, options);

    	const formatter = encoderForArrayFormat(options);

    	const objectCopy = Object.assign({}, object);
    	if (options.skipNull) {
    		for (const key of Object.keys(objectCopy)) {
    			if (objectCopy[key] === undefined || objectCopy[key] === null) {
    				delete objectCopy[key];
    			}
    		}
    	}

    	const keys = Object.keys(objectCopy);

    	if (options.sort !== false) {
    		keys.sort(options.sort);
    	}

    	return keys.map(key => {
    		const value = object[key];

    		if (value === undefined) {
    			return '';
    		}

    		if (value === null) {
    			return encode(key, options);
    		}

    		if (Array.isArray(value)) {
    			return value
    				.reduce(formatter(key), [])
    				.join('&');
    		}

    		return encode(key, options) + '=' + encode(value, options);
    	}).filter(x => x.length > 0).join('&');
    };

    var parseUrl = (input, options) => {
    	return {
    		url: removeHash(input).split('?')[0] || '',
    		query: parse(extract(input), options)
    	};
    };

    var queryString = {
    	extract: extract_1,
    	parse: parse_1,
    	stringify: stringify,
    	parseUrl: parseUrl
    };

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var index_umd = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
       module.exports = factory() ;
    }(commonjsGlobal, function () {
      var defaultExport = /*@__PURE__*/(function (Error) {
        function defaultExport(route, path) {
          var message = "Unreachable '" + route + "', segment '" + path + "' is not defined";
          Error.call(this, message);
          this.message = message;
        }

        if ( Error ) defaultExport.__proto__ = Error;
        defaultExport.prototype = Object.create( Error && Error.prototype );
        defaultExport.prototype.constructor = defaultExport;

        return defaultExport;
      }(Error));

      function buildMatcher(path, parent) {
        var regex;

        var _isSplat;

        var _priority = -100;

        var keys = [];
        regex = path.replace(/[-$.]/g, '\\$&').replace(/\(/g, '(?:').replace(/\)/g, ')?').replace(/([:*]\w+)(?:<([^<>]+?)>)?/g, function (_, key, expr) {
          keys.push(key.substr(1));

          if (key.charAt() === ':') {
            _priority += 100;
            return ("((?!#)" + (expr || '[^#/]+?') + ")");
          }

          _isSplat = true;
          _priority += 500;
          return ("((?!#)" + (expr || '[^#]+?') + ")");
        });

        try {
          regex = new RegExp(("^" + regex + "$"));
        } catch (e) {
          throw new TypeError(("Invalid route expression, given '" + parent + "'"));
        }

        var _hashed = path.includes('#') ? 0.5 : 1;

        var _depth = path.length * _priority * _hashed;

        return {
          keys: keys,
          regex: regex,
          _depth: _depth,
          _isSplat: _isSplat
        };
      }
      var PathMatcher = function PathMatcher(path, parent) {
        var ref = buildMatcher(path, parent);
        var keys = ref.keys;
        var regex = ref.regex;
        var _depth = ref._depth;
        var _isSplat = ref._isSplat;
        return {
          _isSplat: _isSplat,
          _depth: _depth,
          match: function (value) {
            var matches = value.match(regex);

            if (matches) {
              return keys.reduce(function (prev, cur, i) {
                prev[cur] = typeof matches[i + 1] === 'string' ? decodeURIComponent(matches[i + 1]) : null;
                return prev;
              }, {});
            }
          }
        };
      };

      PathMatcher.push = function push (key, prev, leaf, parent) {
        var root = prev[key] || (prev[key] = {});

        if (!root.pattern) {
          root.pattern = new PathMatcher(key, parent);
          root.route = (leaf || '').replace(/\/$/, '') || '/';
        }

        prev.keys = prev.keys || [];

        if (!prev.keys.includes(key)) {
          prev.keys.push(key);
          PathMatcher.sort(prev);
        }

        return root;
      };

      PathMatcher.sort = function sort (root) {
        root.keys.sort(function (a, b) {
          return root[a].pattern._depth - root[b].pattern._depth;
        });
      };

      function merge(path, parent) {
        return ("" + (parent && parent !== '/' ? parent : '') + (path || ''));
      }
      function walk(path, cb) {
        var matches = path.match(/<[^<>]*\/[^<>]*>/);

        if (matches) {
          throw new TypeError(("RegExp cannot contain slashes, given '" + matches + "'"));
        }

        var parts = path.split(/(?=\/|#)/);
        var root = [];

        if (parts[0] !== '/') {
          parts.unshift('/');
        }

        parts.some(function (x, i) {
          var parent = root.slice(1).concat(x).join('') || null;
          var segment = parts.slice(i + 1).join('') || null;
          var retval = cb(x, parent, segment ? ("" + (x !== '/' ? x : '') + segment) : null);
          root.push(x);
          return retval;
        });
      }
      function reduce(key, root, _seen) {
        var params = {};
        var out = [];
        var splat;
        walk(key, function (x, leaf, extra) {
          var found;

          if (!root.keys) {
            throw new defaultExport(key, x);
          }

          root.keys.some(function (k) {
            if (_seen.includes(k)) { return false; }
            var ref = root[k].pattern;
            var match = ref.match;
            var _isSplat = ref._isSplat;
            var matches = match(_isSplat ? extra || x : x);

            if (matches) {
              Object.assign(params, matches);

              if (root[k].route) {
                var routeInfo = Object.assign({}, root[k].info); // properly handle exact-routes!

                var hasMatch = false;

                if (routeInfo.exact) {
                  hasMatch = extra === null;
                } else {
                  hasMatch = !(x && leaf === null) || x === leaf || _isSplat || !extra;
                }

                routeInfo.matches = hasMatch;
                routeInfo.params = Object.assign({}, params);
                routeInfo.route = root[k].route;
                routeInfo.path = _isSplat && extra || leaf || x;
                out.push(routeInfo);
              }

              if (extra === null && !root[k].keys) {
                return true;
              }

              if (k !== '/') { _seen.push(k); }
              splat = _isSplat;
              root = root[k];
              found = true;
              return true;
            }

            return false;
          });

          if (!(found || root.keys.some(function (k) { return root[k].pattern.match(x); }))) {
            throw new defaultExport(key, x);
          }

          return splat || !found;
        });
        return out;
      }
      function find(path, routes, retries) {
        var get = reduce.bind(null, path, routes);
        var set = [];

        while (retries > 0) {
          retries -= 1;

          try {
            return get(set);
          } catch (e) {
            if (retries > 0) {
              return get(set);
            }

            throw e;
          }
        }
      }
      function add(path, routes, parent, routeInfo) {
        var fullpath = merge(path, parent);
        var root = routes;
        var key;

        if (routeInfo && routeInfo.nested !== true) {
          key = routeInfo.key;
          delete routeInfo.key;
        }

        walk(fullpath, function (x, leaf) {
          root = PathMatcher.push(x, root, leaf, fullpath);

          if (x !== '/') {
            root.info = root.info || Object.assign({}, routeInfo);
          }
        });
        root.info = root.info || Object.assign({}, routeInfo);

        if (key) {
          root.info.key = key;
        }

        return fullpath;
      }
      function rm(path, routes, parent) {
        var fullpath = merge(path, parent);
        var root = routes;
        var leaf = null;
        var key = null;
        walk(fullpath, function (x) {
          if (!root) {
            leaf = null;
            return true;
          }

          if (!root.keys) {
            throw new defaultExport(path, x);
          }

          key = x;
          leaf = root;
          root = root[key];
        });

        if (!(leaf && key)) {
          throw new defaultExport(path, key);
        }

        if (leaf === routes) {
          leaf = routes['/'];
        }

        if (leaf.route !== key) {
          var offset = leaf.keys.indexOf(key);

          if (offset === -1) {
            throw new defaultExport(path, key);
          }

          leaf.keys.splice(offset, 1);
          PathMatcher.sort(leaf);
          delete leaf[key];
        }

        if (root.route === leaf.route) {
          delete leaf.info;
        }
      }

      var Router = function Router() {
        var routes = {};
        var stack = [];
        return {
          resolve: function (path, cb) {
            var url = path.split('?')[0];
            var seen = [];
            walk(url, function (x, leaf, extra) {
              try {
                cb(null, find(leaf, routes, 1).filter(function (r) {
                  if (!seen.includes(r.route)) {
                    seen.push(r.route);
                    return true;
                  }

                  return false;
                }));
              } catch (e) {
                cb(e, []);
              }
            });
          },
          mount: function (path, cb) {
            if (path !== '/') {
              stack.push(path);
            }

            cb();
            stack.pop();
          },
          find: function (path, retries) { return find(path, routes, retries === true ? 2 : retries || 1); },
          add: function (path, routeInfo) { return add(path, routes, stack.join(''), routeInfo); },
          rm: function (path) { return rm(path, routes, stack.join('')); }
        };
      };

      Router.matches = function matches (uri, path) {
        return buildMatcher(uri, path).regex.test(path);
      };

      return Router;

    }));
    });

    const cache = {};
    const baseTag = document.getElementsByTagName('base');
    const basePrefix = (baseTag[0] && baseTag[0].href.replace(/\/$/, '')) || '/';

    const ROOT_URL = basePrefix.replace(window.location.origin, '');

    const router = writable({
      path: '/',
      query: {},
      params: {},
    });

    const CTX_ROUTER = {};
    const CTX_ROUTE = {};

    // use location.hash on embedded pages, e.g. Svelte REPL
    let HASHCHANGE = window.location.origin === 'null';

    function hashchangeEnable(value) {
      if (typeof value === 'boolean') {
        HASHCHANGE = !!value;
      }

      return HASHCHANGE;
    }

    function fixedLocation(path, callback) {
      const baseUri = hashchangeEnable() ? window.location.hash.replace('#', '') : window.location.pathname;

      // this will rebase anchors to avoid location changes
      if (path.charAt() !== '/') {
        path = baseUri + path;
      }

      const currentURL = baseUri + window.location.hash + window.location.search;

      // do not change location et all...
      if (currentURL !== path) {
        callback(path);
      }
    }

    function navigateTo(path, options) {
      const {
        reload, replace,
        params, queryParams,
      } = options || {};

      // If path empty or no string, throws error
      if (!path || typeof path !== 'string' || (path[0] !== '/' && path[0] !== '#')) {
        throw new Error(`Expecting '/${path}' or '#${path}', given '${path}'`);
      }

      if (params) {
        path = path.replace(/:([a-zA-Z][a-zA-Z0-9_-]*)/g, (_, key) => params[key]);
      }

      // rebase active URL
      if (ROOT_URL !== '/' && path.indexOf(ROOT_URL) !== 0) {
        path = ROOT_URL + path;
      }

      if (queryParams) {
        const qs = queryString.stringify(queryParams);

        if (qs) {
          path += `?${qs}`;
        }
      }

      if (hashchangeEnable()) {
        window.location.hash = path.replace(/^#/, '');
        return;
      }

      // If no History API support, fallbacks to URL redirect
      if (reload || !window.history.pushState || !window.dispatchEvent) {
        window.location.href = path;
        return;
      }

      // If has History API support, uses it
      fixedLocation(path, nextURL => {
        window.history[replace ? 'replaceState' : 'pushState'](null, '', nextURL);
        window.dispatchEvent(new Event('popstate'));
      });
    }

    function isActive(uri, path, exact) {
      if (!cache[[uri, path, exact]]) {
        if (exact !== true && path.indexOf(uri) === 0) {
          cache[[uri, path, exact]] = /^[#/?]?$/.test(path.substr(uri.length, 1));
        } else if (uri.includes('*') || uri.includes(':')) {
          cache[[uri, path, exact]] = index_umd.matches(uri, path);
        } else {
          cache[[uri, path, exact]] = path === uri;
        }
      }

      return cache[[uri, path, exact]];
    }

    const baseRouter = new index_umd();
    const routeInfo = writable({});

    // private registries
    const onError = {};
    const shared = {};

    let routers = 0;
    let interval;

    // take snapshot from current state...
    router.subscribe(value => { shared.router = value; });
    routeInfo.subscribe(value => { shared.routeInfo = value; });

    function doFallback(failure, fallback) {
      routeInfo.update(defaults => ({
        ...defaults,
        [fallback]: {
          ...shared.router,
          failure,
        },
      }));
    }

    function handleRoutes(map, params) {
      const keys = [];

      map.some(x => {
        if (x.key && x.matches && !x.fallback && !shared.routeInfo[x.key]) {
          if (x.redirect && (x.condition === null || x.condition(shared.router) !== true)) {
            if (x.exact && shared.router.path !== x.path) return false;
            navigateTo(x.redirect);
            return true;
          }

          if (x.exact) {
            keys.push(x.key);
          }

          // extend shared params...
          Object.assign(params, x.params);

          // upgrade matching routes!
          routeInfo.update(defaults => ({
            ...defaults,
            [x.key]: {
              ...shared.router,
              ...x,
            },
          }));
        }

        return false;
      });

      return keys;
    }

    function evtHandler() {
      let baseUri = !hashchangeEnable() ? window.location.href.replace(window.location.origin, '') : window.location.hash || '/';
      let failure;

      // unprefix active URL
      if (ROOT_URL !== '/') {
        baseUri = baseUri.replace(ROOT_URL, '');
      }

      const [fullpath, qs] = baseUri.replace('/#', '#').replace(/^#\//, '/').split('?');
      const query = queryString.parse(qs);
      const params = {};
      const keys = [];

      // reset current state
      routeInfo.set({});
      router.set({
        query,
        params,
        path: fullpath,
      });

      // load all matching routes...
      baseRouter.resolve(fullpath, (err, result) => {
        if (err) {
          failure = err;
          return;
        }

        // save exact-keys for deletion after failures!
        keys.push(...handleRoutes(result, params));
      });

      const toDelete = {};

      if (failure) {
        keys.reduce((prev, cur) => {
          prev[cur] = null;
          return prev;
        }, toDelete);
      }

      try {
        // clear routes that not longer matches!
        baseRouter.find(fullpath).forEach(sub => {
          if (sub.exact && !sub.matches) {
            toDelete[sub.key] = null;
          }
        });
      } catch (e) {
        // this is fine
      }

      // drop unwanted routes...
      routeInfo.update(defaults => ({
        ...defaults,
        ...toDelete,
      }));

      let fallback;

      // invoke error-handlers to clear out previous state!
      Object.keys(onError).forEach(root => {
        if (isActive(root, fullpath, false)) {
          onError[root].callback(failure);
        }

        if (onError[root].fallback) {
          fallback = onError[root].fallback;
        }
      });

      // handle unmatched fallbacks
      if (failure && fallback) {
        doFallback(failure, fallback);
      }
    }

    function findRoutes() {
      clearTimeout(interval);
      interval = setTimeout(evtHandler);
    }

    function addRouter(root, fallback, callback) {
      if (!routers) {
        window.addEventListener('popstate', findRoutes, false);
      }

      // register error-handlers
      onError[root] = { fallback, callback };
      routers += 1;

      return () => {
        delete onError[root];
        routers -= 1;

        if (!routers) {
          window.removeEventListener('popstate', findRoutes, false);
        }
      };
    }

    /* node_modules/yrv/src/Router.svelte generated by Svelte v3.16.4 */
    const file = "node_modules/yrv/src/Router.svelte";

    // (99:0) {#if !disabled}
    function create_if_block_1(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[15].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[14], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty[0] & /*$$scope*/ 16384) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[14], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[14], dirty, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(99:0) {#if !disabled}",
    		ctx
    	});

    	return block;
    }

    // (103:0) {#if failure && !fallback && !nofallback}
    function create_if_block(ctx) {
    	let fieldset;
    	let legend;
    	let t0;
    	let t1;
    	let t2;
    	let pre;
    	let t3;

    	const block = {
    		c: function create() {
    			fieldset = element("fieldset");
    			legend = element("legend");
    			t0 = text("Router failure: ");
    			t1 = text(/*path*/ ctx[1]);
    			t2 = space();
    			pre = element("pre");
    			t3 = text(/*failure*/ ctx[3]);
    			add_location(legend, file, 104, 4, 2236);
    			add_location(pre, file, 105, 4, 2280);
    			attr_dev(fieldset, "data-failure", "");
    			attr_dev(fieldset, "class", "svelte-kx2cky");
    			add_location(fieldset, file, 103, 2, 2208);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, fieldset, anchor);
    			append_dev(fieldset, legend);
    			append_dev(legend, t0);
    			append_dev(legend, t1);
    			append_dev(fieldset, t2);
    			append_dev(fieldset, pre);
    			append_dev(pre, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*path*/ 2) set_data_dev(t1, /*path*/ ctx[1]);
    			if (dirty[0] & /*failure*/ 8) set_data_dev(t3, /*failure*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(fieldset);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(103:0) {#if failure && !fallback && !nofallback}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = !/*disabled*/ ctx[0] && create_if_block_1(ctx);
    	let if_block1 = /*failure*/ ctx[3] && !/*fallback*/ ctx[4] && !/*nofallback*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!/*disabled*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*failure*/ ctx[3] && !/*fallback*/ ctx[4] && !/*nofallback*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function unassignRoute(route) {
    	baseRouter.rm(route);
    	findRoutes();
    }

    function instance($$self, $$props, $$invalidate) {
    	let $basePath;
    	let $router;
    	validate_store(router, "router");
    	component_subscribe($$self, router, $$value => $$invalidate(9, $router = $$value));
    	let cleanup;
    	let failure;
    	let fallback;
    	let { path = "/" } = $$props;
    	let { disabled = false } = $$props;
    	let { condition = null } = $$props;
    	let { nofallback = false } = $$props;
    	const routerContext = getContext(CTX_ROUTER);
    	const basePath = routerContext ? routerContext.basePath : writable(path);
    	validate_store(basePath, "basePath");
    	component_subscribe($$self, basePath, value => $$invalidate(8, $basePath = value));

    	const fixedRoot = $basePath !== path && $basePath !== "/"
    	? `${$basePath}${path !== "/" ? path : ""}`
    	: path;

    	try {
    		if (condition !== null && typeof condition !== "function") {
    			throw new TypeError(`Expecting condition to be a function, given '${condition}'`);
    		}

    		if (path.charAt() !== "#" && path.charAt() !== "/") {
    			throw new TypeError(`Expecting a leading slash or hash, given '${path}'`);
    		}
    	} catch(e) {
    		failure = e;
    	}

    	function assignRoute(key, route, detail) {
    		key = key || Math.random().toString(36).substr(2);
    		const nested = !route.substr(1).includes("/");
    		const handler = { key, nested, ...detail };
    		let fullpath;

    		baseRouter.mount(fixedRoot, () => {
    			fullpath = baseRouter.add(route, handler);
    			$$invalidate(4, fallback = handler.fallback && key || fallback);
    		});

    		findRoutes();
    		return [key, fullpath];
    	}

    	function onError(err) {
    		$$invalidate(3, failure = err);

    		if (failure && fallback) {
    			doFallback(failure, fallback);
    		}
    	}

    	onMount(() => {
    		cleanup = addRouter(fixedRoot, fallback, onError);
    	});

    	onDestroy(() => {
    		if (cleanup) cleanup();
    	});

    	setContext(CTX_ROUTER, { basePath, assignRoute, unassignRoute });
    	const writable_props = ["path", "disabled", "condition", "nofallback"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("path" in $$props) $$invalidate(1, path = $$props.path);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("condition" in $$props) $$invalidate(6, condition = $$props.condition);
    		if ("nofallback" in $$props) $$invalidate(2, nofallback = $$props.nofallback);
    		if ("$$scope" in $$props) $$invalidate(14, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			cleanup,
    			failure,
    			fallback,
    			path,
    			disabled,
    			condition,
    			nofallback,
    			$basePath,
    			$router
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("cleanup" in $$props) cleanup = $$props.cleanup;
    		if ("failure" in $$props) $$invalidate(3, failure = $$props.failure);
    		if ("fallback" in $$props) $$invalidate(4, fallback = $$props.fallback);
    		if ("path" in $$props) $$invalidate(1, path = $$props.path);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("condition" in $$props) $$invalidate(6, condition = $$props.condition);
    		if ("nofallback" in $$props) $$invalidate(2, nofallback = $$props.nofallback);
    		if ("$basePath" in $$props) basePath.set($basePath = $$props.$basePath);
    		if ("$router" in $$props) router.set($router = $$props.$router);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*condition, $router*/ 576) {
    			 if (condition) {
    				$$invalidate(0, disabled = !condition($router));
    			}
    		}
    	};

    	return [
    		disabled,
    		path,
    		nofallback,
    		failure,
    		fallback,
    		basePath,
    		condition,
    		cleanup,
    		$basePath,
    		$router,
    		routerContext,
    		fixedRoot,
    		assignRoute,
    		onError,
    		$$scope,
    		$$slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			path: 1,
    			disabled: 0,
    			condition: 6,
    			nofallback: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get path() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get condition() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set condition(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nofallback() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nofallback(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/yrv/src/Route.svelte generated by Svelte v3.16.4 */
    const file$1 = "node_modules/yrv/src/Route.svelte";

    const get_default_slot_changes = dirty => ({
    	router: dirty[0] & /*activeRouter*/ 2,
    	props: dirty[0] & /*activeProps*/ 4
    });

    const get_default_slot_context = ctx => ({
    	router: /*activeRouter*/ ctx[1],
    	props: /*activeProps*/ ctx[2]
    });

    // (100:0) {#if failure}
    function create_if_block_2(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*failure*/ ctx[3]);
    			attr_dev(p, "data-failure", "");
    			attr_dev(p, "class", "svelte-7lze0z");
    			add_location(p, file$1, 100, 2, 2360);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*failure*/ 8) set_data_dev(t, /*failure*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(100:0) {#if failure}",
    		ctx
    	});

    	return block;
    }

    // (104:0) {#if activeRouter}
    function create_if_block$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(104:0) {#if activeRouter}",
    		ctx
    	});

    	return block;
    }

    // (107:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[22].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[21], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty[0] & /*$$scope, activeRouter, activeProps*/ 2097158) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[21], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[21], dirty, get_default_slot_changes));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(107:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (105:2) {#if component}
    function create_if_block_1$1(ctx) {
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ router: /*activeRouter*/ ctx[1] }, /*activeProps*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty[0] & /*activeRouter, activeProps*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty[0] & /*activeRouter*/ 2 && ({ router: /*activeRouter*/ ctx[1] }),
    					dirty[0] & /*activeProps*/ 4 && get_spread_object(/*activeProps*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(105:2) {#if component}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*failure*/ ctx[3] && create_if_block_2(ctx);
    	let if_block1 = /*activeRouter*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*failure*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*activeRouter*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getProps(given, required) {
    	const { props: sub, ...others } = given;

    	required = !Array.isArray(required)
    	? Object.keys(required)
    	: required;

    	required.forEach(k => {
    		delete others[k];
    	});

    	return { ...sub, ...others };
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $routePath;
    	let $routeInfo;
    	validate_store(routeInfo, "routeInfo");
    	component_subscribe($$self, routeInfo, $$value => $$invalidate(14, $routeInfo = $$value));
    	let { key = null } = $$props;
    	let { path = "/" } = $$props;
    	let { exact = null } = $$props;
    	let { disabled = false } = $$props;
    	let { fallback = null } = $$props;
    	let { component = null } = $$props;
    	let { condition = null } = $$props;
    	let { redirect = null } = $$props;
    	const routeContext = getContext(CTX_ROUTE);
    	const routerContext = getContext(CTX_ROUTER);
    	const { assignRoute, unassignRoute } = routerContext || ({});
    	const routePath = routeContext ? routeContext.routePath : writable(path);
    	validate_store(routePath, "routePath");
    	component_subscribe($$self, routePath, value => $$invalidate(13, $routePath = value));
    	let activeRouter = null;
    	let activeProps = {};
    	let fullpath;
    	let failure;

    	const fixedRoot = $routePath !== path && $routePath !== "/"
    	? `${$routePath}${path !== "/" ? path : ""}`
    	: path;

    	try {
    		if (redirect !== null && !(/^(?:\w+:\/\/|\/)/).test(redirect)) {
    			throw new TypeError(`Expecting valid URL to redirect, given '${redirect}'`);
    		}

    		if (condition !== null && typeof condition !== "function") {
    			throw new TypeError(`Expecting condition to be a function, given '${condition}'`);
    		}

    		if (path.charAt() !== "#" && path.charAt() !== "/") {
    			throw new TypeError(`Expecting a leading slash or hash, given '${path}'`);
    		}

    		if (!assignRoute) {
    			throw new TypeError(`Missing top-level <Router>, given route: ${path}`);
    		}

    		[key, fullpath] = assignRoute(key, fixedRoot, { condition, redirect, fallback, exact });
    	} catch(e) {
    		failure = e;
    	}

    	onDestroy(() => {
    		if (unassignRoute) {
    			unassignRoute(fullpath);
    		}
    	});

    	setContext(CTX_ROUTE, { routePath });
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate(20, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("key" in $$new_props) $$invalidate(5, key = $$new_props.key);
    		if ("path" in $$new_props) $$invalidate(6, path = $$new_props.path);
    		if ("exact" in $$new_props) $$invalidate(7, exact = $$new_props.exact);
    		if ("disabled" in $$new_props) $$invalidate(8, disabled = $$new_props.disabled);
    		if ("fallback" in $$new_props) $$invalidate(9, fallback = $$new_props.fallback);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("condition" in $$new_props) $$invalidate(10, condition = $$new_props.condition);
    		if ("redirect" in $$new_props) $$invalidate(11, redirect = $$new_props.redirect);
    		if ("$$scope" in $$new_props) $$invalidate(21, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			key,
    			path,
    			exact,
    			disabled,
    			fallback,
    			component,
    			condition,
    			redirect,
    			activeRouter,
    			activeProps,
    			fullpath,
    			failure,
    			$routePath,
    			$routeInfo
    		};
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(20, $$props = assign(assign({}, $$props), $$new_props));
    		if ("key" in $$props) $$invalidate(5, key = $$new_props.key);
    		if ("path" in $$props) $$invalidate(6, path = $$new_props.path);
    		if ("exact" in $$props) $$invalidate(7, exact = $$new_props.exact);
    		if ("disabled" in $$props) $$invalidate(8, disabled = $$new_props.disabled);
    		if ("fallback" in $$props) $$invalidate(9, fallback = $$new_props.fallback);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("condition" in $$props) $$invalidate(10, condition = $$new_props.condition);
    		if ("redirect" in $$props) $$invalidate(11, redirect = $$new_props.redirect);
    		if ("activeRouter" in $$props) $$invalidate(1, activeRouter = $$new_props.activeRouter);
    		if ("activeProps" in $$props) $$invalidate(2, activeProps = $$new_props.activeProps);
    		if ("fullpath" in $$props) fullpath = $$new_props.fullpath;
    		if ("failure" in $$props) $$invalidate(3, failure = $$new_props.failure);
    		if ("$routePath" in $$props) routePath.set($routePath = $$new_props.$routePath);
    		if ("$routeInfo" in $$props) routeInfo.set($routeInfo = $$new_props.$routeInfo);
    	};

    	$$self.$$.update = () => {
    		 if (key) {
    			$$invalidate(1, activeRouter = !disabled && $routeInfo[key]);
    			$$invalidate(2, activeProps = getProps($$props, arguments[0].$$.props));
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		activeRouter,
    		activeProps,
    		failure,
    		routePath,
    		key,
    		path,
    		exact,
    		disabled,
    		fallback,
    		condition,
    		redirect,
    		fullpath,
    		$routePath,
    		$routeInfo,
    		routeContext,
    		routerContext,
    		assignRoute,
    		unassignRoute,
    		fixedRoot,
    		$$props,
    		$$scope,
    		$$slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			key: 5,
    			path: 6,
    			exact: 7,
    			disabled: 8,
    			fallback: 9,
    			component: 0,
    			condition: 10,
    			redirect: 11
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get key() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get exact() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exact(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fallback() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fallback(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get condition() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set condition(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redirect() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set redirect(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/yrv/src/Link.svelte generated by Svelte v3.16.4 */
    const file$2 = "node_modules/yrv/src/Link.svelte";

    // (73:0) {:else}
    function create_else_block$1(ctx) {
    	let a;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "href", /*fixedHref*/ ctx[4]);
    			attr_dev(a, "class", /*className*/ ctx[0]);
    			attr_dev(a, "title", /*title*/ ctx[1]);
    			add_location(a, file$2, 73, 2, 1696);
    			dispose = listen_dev(a, "click", prevent_default(/*onClick*/ ctx[5]), false, true, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			/*a_binding*/ ctx[18](a);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty[0] & /*$$scope*/ 32768) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[15], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null));
    			}

    			if (!current || dirty[0] & /*fixedHref*/ 16) {
    				attr_dev(a, "href", /*fixedHref*/ ctx[4]);
    			}

    			if (!current || dirty[0] & /*className*/ 1) {
    				attr_dev(a, "class", /*className*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*title*/ 2) {
    				attr_dev(a, "title", /*title*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			/*a_binding*/ ctx[18](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(73:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (69:0) {#if button}
    function create_if_block$2(ctx) {
    	let button_1;
    	let current;
    	let dispose;
    	const default_slot_template = /*$$slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	const block = {
    		c: function create() {
    			button_1 = element("button");
    			if (default_slot) default_slot.c();
    			attr_dev(button_1, "class", /*className*/ ctx[0]);
    			attr_dev(button_1, "title", /*title*/ ctx[1]);
    			add_location(button_1, file$2, 69, 2, 1576);
    			dispose = listen_dev(button_1, "click", prevent_default(/*onClick*/ ctx[5]), false, true, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button_1, anchor);

    			if (default_slot) {
    				default_slot.m(button_1, null);
    			}

    			/*button_1_binding*/ ctx[17](button_1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot && default_slot.p && dirty[0] & /*$$scope*/ 32768) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[15], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null));
    			}

    			if (!current || dirty[0] & /*className*/ 1) {
    				attr_dev(button_1, "class", /*className*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*title*/ 2) {
    				attr_dev(button_1, "title", /*title*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button_1);
    			if (default_slot) default_slot.d(detaching);
    			/*button_1_binding*/ ctx[17](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(69:0) {#if button}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*button*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $router;
    	validate_store(router, "router");
    	component_subscribe($$self, router, $$value => $$invalidate(13, $router = $$value));
    	let ref;
    	let active;
    	let { class: cssClass = "" } = $$props;
    	let fixedHref = null;
    	let { go = null } = $$props;
    	let { href = "/" } = $$props;
    	let { title = "" } = $$props;
    	let { button = false } = $$props;
    	let { exact = false } = $$props;
    	let { reload = false } = $$props;
    	let { replace = false } = $$props;
    	let { className = "" } = $$props;

    	if (ROOT_URL !== "/") {
    		fixedHref = ROOT_URL + href;
    	} else {
    		fixedHref = href;
    	}

    	onMount(() => {
    		$$invalidate(0, className = className || cssClass);
    	});

    	const dispatch = createEventDispatcher();

    	function onClick(e) {
    		if (typeof go === "string" && window.history.length > 1) {
    			if (go === "back") window.history.back(); else if (go === "fwd") window.history.forward(); else window.history.go(parseInt(go, 10));
    			return;
    		}

    		fixedLocation(href, nextURL => {
    			navigateTo(nextURL, { reload, replace });
    			dispatch("click", e);
    		});
    	}

    	const writable_props = [
    		"class",
    		"go",
    		"href",
    		"title",
    		"button",
    		"exact",
    		"reload",
    		"replace",
    		"className"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Link> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function button_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, ref = $$value);
    		});
    	}

    	function a_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(3, ref = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate(6, cssClass = $$props.class);
    		if ("go" in $$props) $$invalidate(7, go = $$props.go);
    		if ("href" in $$props) $$invalidate(8, href = $$props.href);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("button" in $$props) $$invalidate(2, button = $$props.button);
    		if ("exact" in $$props) $$invalidate(9, exact = $$props.exact);
    		if ("reload" in $$props) $$invalidate(10, reload = $$props.reload);
    		if ("replace" in $$props) $$invalidate(11, replace = $$props.replace);
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("$$scope" in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			ref,
    			active,
    			cssClass,
    			fixedHref,
    			go,
    			href,
    			title,
    			button,
    			exact,
    			reload,
    			replace,
    			className,
    			$router
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("ref" in $$props) $$invalidate(3, ref = $$props.ref);
    		if ("active" in $$props) $$invalidate(12, active = $$props.active);
    		if ("cssClass" in $$props) $$invalidate(6, cssClass = $$props.cssClass);
    		if ("fixedHref" in $$props) $$invalidate(4, fixedHref = $$props.fixedHref);
    		if ("go" in $$props) $$invalidate(7, go = $$props.go);
    		if ("href" in $$props) $$invalidate(8, href = $$props.href);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("button" in $$props) $$invalidate(2, button = $$props.button);
    		if ("exact" in $$props) $$invalidate(9, exact = $$props.exact);
    		if ("reload" in $$props) $$invalidate(10, reload = $$props.reload);
    		if ("replace" in $$props) $$invalidate(11, replace = $$props.replace);
    		if ("className" in $$props) $$invalidate(0, className = $$props.className);
    		if ("$router" in $$props) router.set($router = $$props.$router);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*ref, $router, href, exact, active, button*/ 13068) {
    			 if (ref && $router.path) {
    				if (isActive(href, $router.path, exact)) {
    					if (!active) {
    						$$invalidate(12, active = true);
    						ref.setAttribute("aria-current", "page");

    						if (button) {
    							ref.setAttribute("disabled", true);
    						}
    					}
    				} else if (active) {
    					$$invalidate(12, active = false);
    					ref.removeAttribute("disabled");
    					ref.removeAttribute("aria-current");
    				}
    			}
    		}
    	};

    	return [
    		className,
    		title,
    		button,
    		ref,
    		fixedHref,
    		onClick,
    		cssClass,
    		go,
    		href,
    		exact,
    		reload,
    		replace,
    		active,
    		$router,
    		dispatch,
    		$$scope,
    		$$slots,
    		button_1_binding,
    		a_binding
    	];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			class: 6,
    			go: 7,
    			href: 8,
    			title: 1,
    			button: 2,
    			exact: 9,
    			reload: 10,
    			replace: 11,
    			className: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get class() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get go() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set go(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get button() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set button(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get exact() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exact(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reload() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reload(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get className() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set className(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    Object.defineProperty(Router, 'hashchange', {
      set: value => hashchangeEnable(value),
      get: () => hashchangeEnable(),
      configurable: false,
      enumerable: false,
    });

    /* client/Nav.svelte generated by Svelte v3.16.4 */
    const file$3 = "client/Nav.svelte";

    // (28:8) <Link class="navbar-item" href="/">
    function create_default_slot_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Home");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(28:8) <Link class=\\\"navbar-item\\\" href=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (29:8) <Link class="navbar-item" href="#about">
    function create_default_slot_5(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Svelte Route");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(29:8) <Link class=\\\"navbar-item\\\" href=\\\"#about\\\">",
    		ctx
    	});

    	return block;
    }

    // (43:8) <Link class="navbar-item" href="#app/common?p1=test&p2=3">
    function create_default_slot_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Common Route");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(43:8) <Link class=\\\"navbar-item\\\" href=\\\"#app/common?p1=test&p2=3\\\">",
    		ctx
    	});

    	return block;
    }

    // (44:8) {#if $user}
    function create_if_block_1$2(ctx) {
    	let current;

    	const link = new Link({
    			props: {
    				class: "navbar-item",
    				href: "#secure",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(link.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(link, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(link, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(44:8) {#if $user}",
    		ctx
    	});

    	return block;
    }

    // (44:19) <Link class="navbar-item" href="#secure">
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Secure Route");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(44:19) <Link class=\\\"navbar-item\\\" href=\\\"#secure\\\">",
    		ctx
    	});

    	return block;
    }

    // (45:8) <Link class="navbar-item" href="#catch-it">
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Catch All");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(45:8) <Link class=\\\"navbar-item\\\" href=\\\"#catch-it\\\">",
    		ctx
    	});

    	return block;
    }

    // (58:4) {:else}
    function create_else_block$2(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let div2;
    	let div1;
    	let current;

    	const link = new Link({
    			props: {
    				class: "button is-danger",
    				href: "#logout",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text("Hi ");
    			t1 = text(/*$user*/ ctx[1]);
    			t2 = space();
    			div2 = element("div");
    			div1 = element("div");
    			create_component(link.$$.fragment);
    			attr_dev(div0, "class", "navbar-item");
    			add_location(div0, file$3, 58, 8, 2024);
    			attr_dev(div1, "class", "buttons");
    			add_location(div1, file$3, 62, 8, 2130);
    			attr_dev(div2, "class", "navbar-item");
    			add_location(div2, file$3, 61, 8, 2096);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			mount_component(link, div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*$user*/ 2) set_data_dev(t1, /*$user*/ ctx[1]);
    			const link_changes = {};

    			if (dirty[0] & /*$$scope*/ 8) {
    				link_changes.$$scope = { dirty, ctx };
    			}

    			link.$set(link_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    			destroy_component(link);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(58:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (50:4) {#if !$user}
    function create_if_block$3(ctx) {
    	let div1;
    	let div0;
    	let current;

    	const link = new Link({
    			props: {
    				class: "button is-light",
    				href: "#login",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(link.$$.fragment);
    			attr_dev(div0, "class", "buttons");
    			add_location(div0, file$3, 51, 8, 1860);
    			attr_dev(div1, "class", "navbar-item");
    			add_location(div1, file$3, 50, 8, 1826);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(link, div0, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const link_changes = {};

    			if (dirty[0] & /*$$scope*/ 8) {
    				link_changes.$$scope = { dirty, ctx };
    			}

    			link.$set(link_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(link);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(50:4) {#if !$user}",
    		ctx
    	});

    	return block;
    }

    // (64:10) <Link class="button is-danger" href="#logout">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Log Out");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(64:10) <Link class=\\\"button is-danger\\\" href=\\\"#logout\\\">",
    		ctx
    	});

    	return block;
    }

    // (53:10) <Link class="button is-light" href="#login">
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Log in");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(53:10) <Link class=\\\"button is-light\\\" href=\\\"#login\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let nav;
    	let div1;
    	let a0;
    	let strong;
    	let t1;
    	let div0;
    	let span0;
    	let t2;
    	let span1;
    	let t3;
    	let span2;
    	let div0_class_value;
    	let t4;
    	let div5;
    	let div4;
    	let t5;
    	let t6;
    	let div3;
    	let a1;
    	let t8;
    	let div2;
    	let a2;
    	let t10;
    	let a3;
    	let t12;
    	let t13;
    	let t14;
    	let div5_class_value;
    	let t15;
    	let div6;
    	let current_block_type_index;
    	let if_block1;
    	let current;
    	let dispose;

    	const link0 = new Link({
    			props: {
    				class: "navbar-item",
    				href: "/",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const link1 = new Link({
    			props: {
    				class: "navbar-item",
    				href: "#about",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const link2 = new Link({
    			props: {
    				class: "navbar-item",
    				href: "#app/common?p1=test&p2=3",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block0 = /*$user*/ ctx[1] && create_if_block_1$2(ctx);

    	const link3 = new Link({
    			props: {
    				class: "navbar-item",
    				href: "#catch-it",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block$3, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*$user*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div1 = element("div");
    			a0 = element("a");
    			strong = element("strong");
    			strong.textContent = "Svelte-Cr";
    			t1 = space();
    			div0 = element("div");
    			span0 = element("span");
    			t2 = space();
    			span1 = element("span");
    			t3 = space();
    			span2 = element("span");
    			t4 = space();
    			div5 = element("div");
    			div4 = element("div");
    			create_component(link0.$$.fragment);
    			t5 = space();
    			create_component(link1.$$.fragment);
    			t6 = space();
    			div3 = element("div");
    			a1 = element("a");
    			a1.textContent = "Server Routes";
    			t8 = space();
    			div2 = element("div");
    			a2 = element("a");
    			a2.textContent = "String";
    			t10 = space();
    			a3 = element("a");
    			a3.textContent = "JSON";
    			t12 = space();
    			create_component(link2.$$.fragment);
    			t13 = space();
    			if (if_block0) if_block0.c();
    			t14 = space();
    			create_component(link3.$$.fragment);
    			t15 = space();
    			div6 = element("div");
    			if_block1.c();
    			add_location(strong, file$3, 17, 8, 443);
    			attr_dev(a0, "class", "navbar-item");
    			attr_dev(a0, "href", "https://github.com/sachinbhutani/svelte-cr");
    			add_location(a0, file$3, 16, 8, 361);
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$3, 20, 12, 636);
    			attr_dev(span1, "aria-hidden", "true");
    			add_location(span1, file$3, 21, 12, 681);
    			attr_dev(span2, "aria-hidden", "true");
    			add_location(span2, file$3, 22, 12, 726);
    			attr_dev(div0, "role", "button");
    			attr_dev(div0, "class", div0_class_value = "navbar-burger " + (/*isActive*/ ctx[0] ? "is-active" : ""));
    			attr_dev(div0, "aria-label", "menu");
    			attr_dev(div0, "aria-expanded", "false");
    			add_location(div0, file$3, 19, 8, 491);
    			attr_dev(div1, "class", "navbar-brand");
    			add_location(div1, file$3, 15, 4, 326);
    			attr_dev(a1, "class", "navbar-link");
    			attr_dev(a1, "href", "/api");
    			add_location(a1, file$3, 30, 16, 1087);
    			attr_dev(a2, "class", "navbar-item");
    			attr_dev(a2, "href", "/api");
    			add_location(a2, file$3, 34, 20, 1244);
    			attr_dev(a3, "class", "navbar-item");
    			attr_dev(a3, "href", "/api/message");
    			add_location(a3, file$3, 37, 20, 1356);
    			attr_dev(div2, "class", "navbar-dropdown");
    			add_location(div2, file$3, 33, 20, 1194);
    			attr_dev(div3, "class", "navbar-item has-dropdown is-hoverable");
    			add_location(div3, file$3, 29, 12, 1019);
    			attr_dev(div4, "class", "navbar-start");
    			add_location(div4, file$3, 26, 8, 853);
    			attr_dev(div5, "class", div5_class_value = "navbar-menu  " + (/*isActive*/ ctx[0] ? "is-active" : ""));
    			add_location(div5, file$3, 25, 4, 789);
    			attr_dev(div6, "class", "navbar-end");
    			add_location(div6, file$3, 48, 4, 1776);
    			attr_dev(nav, "class", "navbar is-primary");
    			attr_dev(nav, "role", "navigation");
    			attr_dev(nav, "aria-label", "main navigation");
    			add_location(nav, file$3, 14, 0, 243);
    			dispose = listen_dev(div0, "click", /*toggleMenu*/ ctx[2], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div1);
    			append_dev(div1, a0);
    			append_dev(a0, strong);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t2);
    			append_dev(div0, span1);
    			append_dev(div0, t3);
    			append_dev(div0, span2);
    			append_dev(nav, t4);
    			append_dev(nav, div5);
    			append_dev(div5, div4);
    			mount_component(link0, div4, null);
    			append_dev(div4, t5);
    			mount_component(link1, div4, null);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, a1);
    			append_dev(div3, t8);
    			append_dev(div3, div2);
    			append_dev(div2, a2);
    			append_dev(div2, t10);
    			append_dev(div2, a3);
    			append_dev(div4, t12);
    			mount_component(link2, div4, null);
    			append_dev(div4, t13);
    			if (if_block0) if_block0.m(div4, null);
    			append_dev(div4, t14);
    			mount_component(link3, div4, null);
    			append_dev(nav, t15);
    			append_dev(nav, div6);
    			if_blocks[current_block_type_index].m(div6, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*isActive*/ 1 && div0_class_value !== (div0_class_value = "navbar-burger " + (/*isActive*/ ctx[0] ? "is-active" : ""))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			const link0_changes = {};

    			if (dirty[0] & /*$$scope*/ 8) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty[0] & /*$$scope*/ 8) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty[0] & /*$$scope*/ 8) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);

    			if (/*$user*/ ctx[1]) {
    				if (!if_block0) {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div4, t14);
    				} else {
    					transition_in(if_block0, 1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			const link3_changes = {};

    			if (dirty[0] & /*$$scope*/ 8) {
    				link3_changes.$$scope = { dirty, ctx };
    			}

    			link3.$set(link3_changes);

    			if (!current || dirty[0] & /*isActive*/ 1 && div5_class_value !== (div5_class_value = "navbar-menu  " + (/*isActive*/ ctx[0] ? "is-active" : ""))) {
    				attr_dev(div5, "class", div5_class_value);
    			}

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
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div6, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(link3.$$.fragment, local);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(link3.$$.fragment, local);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    			if (if_block0) if_block0.d();
    			destroy_component(link3);
    			if_blocks[current_block_type_index].d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(1, $user = $$value));
    	let isActive = false;

    	function toggleMenu() {
    		$$invalidate(0, isActive = !isActive);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("isActive" in $$props) $$invalidate(0, isActive = $$props.isActive);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    	};

    	return [isActive, $user, toggleMenu];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* client/Footer.svelte generated by Svelte v3.16.4 */
    const file$4 = "client/Footer.svelte";

    function create_fragment$4(ctx) {
    	let hr;
    	let t0;
    	let pre0;
    	let t2;
    	let pre1;
    	let t3;
    	let t4_value = JSON.stringify(/*$router*/ ctx[0], null, 2) + "";
    	let t4;

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			t0 = space();
    			pre0 = element("pre");
    			pre0.textContent = "Your Footer markup goes here";
    			t2 = space();
    			pre1 = element("pre");
    			t3 = text("Router Info from svelte store: ");
    			t4 = text(t4_value);
    			add_location(hr, file$4, 4, 0, 54);
    			add_location(pre0, file$4, 5, 0, 59);
    			add_location(pre1, file$4, 6, 0, 100);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, pre0, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, pre1, anchor);
    			append_dev(pre1, t3);
    			append_dev(pre1, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$router*/ 1 && t4_value !== (t4_value = JSON.stringify(/*$router*/ ctx[0], null, 2) + "")) set_data_dev(t4, t4_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(pre0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(pre1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $router;
    	validate_store(router, "router");
    	component_subscribe($$self, router, $$value => $$invalidate(0, $router = $$value));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$router" in $$props) router.set($router = $$props.$router);
    	};

    	return [$router];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* client/pages/Home.svelte generated by Svelte v3.16.4 */

    const file$5 = "client/pages/Home.svelte";

    function create_fragment$5(ctx) {
    	let center;
    	let h1;
    	let t1;
    	let h4;
    	let t3;
    	let ul;
    	let li0;
    	let a0;
    	let t5;
    	let t6;
    	let li1;
    	let a1;
    	let t8;
    	let t9;
    	let li2;
    	let a2;
    	let t11;
    	let t12;
    	let li3;
    	let a3;
    	let t14;

    	const block = {
    		c: function create() {
    			center = element("center");
    			h1 = element("h1");
    			h1.textContent = "Svelte-Cr";
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "A compiled frontend, deserves a compiled backend";
    			t3 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Svelte JS";
    			t5 = text(" - Cybernetically enhanced web apps");
    			t6 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Kemal-cr";
    			t8 = text(" - A web framework for Crystal");
    			t9 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "YRV Router";
    			t11 = text(" - Your routing bro!");
    			t12 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "Bulma CSS ";
    			t14 = text("- Modern CSS framework based on Flexbox");
    			attr_dev(h1, "class", "title is-primary is-1");
    			add_location(h1, file$5, 1, 0, 9);
    			attr_dev(h4, "class", "subtitle is-4");
    			add_location(h4, file$5, 2, 0, 59);
    			attr_dev(a0, "href", "https://svelte.dev/");
    			add_location(a0, file$5, 4, 5, 150);
    			add_location(li0, file$5, 4, 1, 146);
    			attr_dev(a1, "href", "https://kemalcr.com/");
    			add_location(a1, file$5, 5, 5, 241);
    			add_location(li1, file$5, 5, 1, 237);
    			attr_dev(a2, "href", "https://github.com/pateketrueke/yrv");
    			add_location(a2, file$5, 6, 5, 327);
    			add_location(li2, file$5, 6, 1, 323);
    			attr_dev(a3, "href", "https://bulma.io");
    			add_location(a3, file$5, 7, 5, 421);
    			add_location(li3, file$5, 7, 1, 417);
    			add_location(ul, file$5, 3, 0, 140);
    			add_location(center, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, center, anchor);
    			append_dev(center, h1);
    			append_dev(center, t1);
    			append_dev(center, h4);
    			append_dev(center, t3);
    			append_dev(center, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(li0, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(li1, t8);
    			append_dev(ul, t9);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    			append_dev(li2, t11);
    			append_dev(ul, t12);
    			append_dev(ul, li3);
    			append_dev(li3, a3);
    			append_dev(li3, t14);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(center);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* client/pages/About.svelte generated by Svelte v3.16.4 */

    const file$6 = "client/pages/About.svelte";

    function create_fragment$6(ctx) {
    	let h1;
    	let t1;
    	let h4;
    	let p;
    	let t2;
    	let br;
    	let t3;
    	let t4;
    	let a0;
    	let t6;
    	let a1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Svelte-Cr";
    			t1 = space();
    			h4 = element("h4");
    			p = element("p");
    			t2 = text("This component was servered by YRV svelte routing...\n    ");
    			br = element("br");
    			t3 = text("\n    Use svelte routes with # instead of / for browser history and refresh buttons to work correctly");
    			t4 = space();
    			a0 = element("a");
    			a0.textContent = "YRV Github |";
    			t6 = space();
    			a1 = element("a");
    			a1.textContent = "YRV REPL";
    			add_location(h1, file$6, 0, 0, 0);
    			add_location(br, file$6, 4, 4, 90);
    			add_location(p, file$6, 2, 4, 25);
    			add_location(h4, file$6, 2, 0, 21);
    			attr_dev(a0, "href", "https://github.com/pateketrueke/yrv");
    			add_location(a0, file$6, 8, 0, 206);
    			attr_dev(a1, "href", "https://svelte.dev/repl/0f07c6134b16432591a9a3a0095a80de?version=3.14.1");
    			add_location(a1, file$6, 9, 0, 271);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h4, anchor);
    			append_dev(h4, p);
    			append_dev(p, t2);
    			append_dev(p, br);
    			append_dev(p, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, a0, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, a1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h4);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(a0);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(a1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* client/pages/Common.svelte generated by Svelte v3.16.4 */
    const file$7 = "client/pages/Common.svelte";

    function create_fragment$7(ctx) {
    	let h1;
    	let t1;
    	let h3;
    	let t3;
    	let ul;
    	let li0;
    	let t4;
    	let t5_value = /*contents*/ ctx[0].app + "";
    	let t5;
    	let t6;
    	let li1;
    	let t7;
    	let t8_value = /*contents*/ ctx[0].version + "";
    	let t8;
    	let t9;
    	let li2;
    	let t10;
    	let t11_value = /*contents*/ ctx[0].status + "";
    	let t11;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Common Route on client and server";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "Data recieved from server on mount:";
    			t3 = space();
    			ul = element("ul");
    			li0 = element("li");
    			t4 = text("App : ");
    			t5 = text(t5_value);
    			t6 = space();
    			li1 = element("li");
    			t7 = text("Version : ");
    			t8 = text(t8_value);
    			t9 = space();
    			li2 = element("li");
    			t10 = text("Status: ");
    			t11 = text(t11_value);
    			add_location(h1, file$7, 13, 0, 324);
    			add_location(h3, file$7, 14, 0, 369);
    			add_location(li0, file$7, 16, 4, 425);
    			add_location(li1, file$7, 17, 4, 461);
    			add_location(li2, file$7, 18, 4, 505);
    			add_location(ul, file$7, 15, 0, 416);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, t4);
    			append_dev(li0, t5);
    			append_dev(ul, t6);
    			append_dev(ul, li1);
    			append_dev(li1, t7);
    			append_dev(li1, t8);
    			append_dev(ul, t9);
    			append_dev(ul, li2);
    			append_dev(li2, t10);
    			append_dev(li2, t11);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*contents*/ 1 && t5_value !== (t5_value = /*contents*/ ctx[0].app + "")) set_data_dev(t5, t5_value);
    			if (dirty[0] & /*contents*/ 1 && t8_value !== (t8_value = /*contents*/ ctx[0].version + "")) set_data_dev(t8, t8_value);
    			if (dirty[0] & /*contents*/ 1 && t11_value !== (t11_value = /*contents*/ ctx[0].status + "")) set_data_dev(t11, t11_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(ul);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $router;
    	validate_store(router, "router");
    	component_subscribe($$self, router, $$value => $$invalidate(1, $router = $$value));
    	let { contents = "" } = $$props;
    	onMount(() => getContext());

    	async function getContext() {
    		let api_path = $router.path.replace("#", "/");
    		const res = await fetch(api_path);
    		$$invalidate(0, contents = await res.json());
    	}

    	const writable_props = ["contents"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Common> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("contents" in $$props) $$invalidate(0, contents = $$props.contents);
    	};

    	$$self.$capture_state = () => {
    		return { contents, $router };
    	};

    	$$self.$inject_state = $$props => {
    		if ("contents" in $$props) $$invalidate(0, contents = $$props.contents);
    		if ("$router" in $$props) router.set($router = $$props.$router);
    	};

    	return [contents];
    }

    class Common extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$7, safe_not_equal, { contents: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Common",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get contents() {
    		throw new Error("<Common>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set contents(value) {
    		throw new Error("<Common>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* client/pages/Catcher.svelte generated by Svelte v3.16.4 */
    const file$8 = "client/pages/Catcher.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1_value = /*$router*/ ctx[0].params.name + "";
    	let t1;
    	let t2;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text("Caught Path: ");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			p.textContent = "This component is served for all routes like '#blahblah'";
    			add_location(h1, file$8, 5, 0, 76);
    			add_location(p, file$8, 6, 4, 124);
    			attr_dev(div, "class", "content");
    			add_location(div, file$8, 3, 0, 53);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(div, t2);
    			append_dev(div, p);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$router*/ 1 && t1_value !== (t1_value = /*$router*/ ctx[0].params.name + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $router;
    	validate_store(router, "router");
    	component_subscribe($$self, router, $$value => $$invalidate(0, $router = $$value));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("$router" in $$props) router.set($router = $$props.$router);
    	};

    	return [$router];
    }

    class Catcher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Catcher",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* client/pages/Login.svelte generated by Svelte v3.16.4 */
    const file$9 = "client/pages/Login.svelte";

    // (68:0) {:else}
    function create_else_block$3(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2;
    	let br;
    	let t3;
    	let strong;
    	let t5;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("Logged in as: ");
    			t1 = text(/*$user*/ ctx[3]);
    			t2 = space();
    			br = element("br");
    			t3 = text("\n Now you may access the ");
    			strong = element("strong");
    			strong.textContent = "secure area ";
    			t5 = text("from the Nav above");
    			add_location(br, file$9, 69, 23, 2125);
    			add_location(strong, file$9, 70, 24, 2154);
    			attr_dev(div, "class", "column");
    			add_location(div, file$9, 68, 1, 2081);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    			append_dev(div, br);
    			append_dev(div, t3);
    			append_dev(div, strong);
    			append_dev(div, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$user*/ 8) set_data_dev(t1, /*$user*/ ctx[3]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(68:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (34:0) {#if !$user}
    function create_if_block$4(ctx) {
    	let div5;
    	let t0;
    	let div1;
    	let label0;
    	let t2;
    	let div0;
    	let input0;
    	let t3;
    	let span0;
    	let i0;
    	let t4;
    	let div3;
    	let label1;
    	let t6;
    	let div2;
    	let input1;
    	let t7;
    	let span1;
    	let i1;
    	let t8;
    	let pre;
    	let t9;
    	let strong;
    	let t11;
    	let t12;
    	let div4;
    	let p;
    	let button;
    	let dispose;
    	let if_block = /*errorMessage*/ ctx[2] && create_if_block_1$3(ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Username";
    			t2 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t3 = space();
    			span0 = element("span");
    			i0 = element("i");
    			t4 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Password";
    			t6 = space();
    			div2 = element("div");
    			input1 = element("input");
    			t7 = space();
    			span1 = element("span");
    			i1 = element("i");
    			t8 = space();
    			pre = element("pre");
    			t9 = text("Enter any ");
    			strong = element("strong");
    			strong.textContent = "username = password ";
    			t11 = text("to login");
    			t12 = space();
    			div4 = element("div");
    			p = element("p");
    			button = element("button");
    			button.textContent = "Login";
    			attr_dev(label0, "class", "label");
    			add_location(label0, file$9, 41, 4, 1186);
    			attr_dev(input0, "class", "input");
    			attr_dev(input0, "type", "username");
    			attr_dev(input0, "placeholder", "username");
    			add_location(input0, file$9, 43, 12, 1281);
    			attr_dev(i0, "class", "fas fa-user");
    			add_location(i0, file$9, 45, 16, 1433);
    			attr_dev(span0, "class", "icon is-small is-left");
    			add_location(span0, file$9, 44, 16, 1380);
    			attr_dev(div0, "class", "control has-icons-left");
    			add_location(div0, file$9, 42, 8, 1232);
    			attr_dev(div1, "class", "field");
    			add_location(div1, file$9, 40, 4, 1162);
    			attr_dev(label1, "class", "label");
    			add_location(label1, file$9, 50, 4, 1539);
    			attr_dev(input1, "class", "input");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "Password");
    			add_location(input1, file$9, 52, 8, 1626);
    			attr_dev(i1, "class", "fas fa-lock");
    			add_location(i1, file$9, 54, 8, 1762);
    			attr_dev(span1, "class", "icon is-small is-left");
    			add_location(span1, file$9, 53, 8, 1717);
    			attr_dev(div2, "class", "control has-icons-left");
    			add_location(div2, file$9, 51, 4, 1581);
    			attr_dev(div3, "class", "field");
    			add_location(div3, file$9, 49, 4, 1515);
    			add_location(strong, file$9, 58, 19, 1847);
    			add_location(pre, file$9, 58, 4, 1832);
    			attr_dev(button, "class", "button is-success");
    			add_location(button, file$9, 61, 8, 1955);
    			attr_dev(p, "class", "control");
    			add_location(p, file$9, 60, 4, 1927);
    			attr_dev(div4, "class", "field");
    			add_location(div4, file$9, 59, 4, 1903);
    			attr_dev(div5, "class", "column");
    			add_location(div5, file$9, 34, 0, 1021);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    				listen_dev(button, "click", /*handleLogin*/ ctx[4], false, false, false)
    			];
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			if (if_block) if_block.m(div5, null);
    			append_dev(div5, t0);
    			append_dev(div5, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append_dev(div0, t3);
    			append_dev(div0, span0);
    			append_dev(span0, i0);
    			append_dev(div5, t4);
    			append_dev(div5, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t6);
    			append_dev(div3, div2);
    			append_dev(div2, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(div2, t7);
    			append_dev(div2, span1);
    			append_dev(span1, i1);
    			append_dev(div5, t8);
    			append_dev(div5, pre);
    			append_dev(pre, t9);
    			append_dev(pre, strong);
    			append_dev(pre, t11);
    			append_dev(div5, t12);
    			append_dev(div5, div4);
    			append_dev(div4, p);
    			append_dev(p, button);
    		},
    		p: function update(ctx, dirty) {
    			if (/*errorMessage*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$3(ctx);
    					if_block.c();
    					if_block.m(div5, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*username*/ 1) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty[0] & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(34:0) {#if !$user}",
    		ctx
    	});

    	return block;
    }

    // (36:4) {#if errorMessage}
    function create_if_block_1$3(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*errorMessage*/ ctx[2]);
    			attr_dev(div, "class", "notification is-danger");
    			add_location(div, file$9, 36, 8, 1073);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*errorMessage*/ 4) set_data_dev(t, /*errorMessage*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(36:4) {#if errorMessage}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let div1;

    	function select_block_type(ctx, dirty) {
    		if (!/*$user*/ ctx[3]) return create_if_block$4;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "column");
    			add_location(div0, file$9, 32, 0, 981);
    			attr_dev(div1, "class", "column");
    			add_location(div1, file$9, 73, 0, 2216);
    			attr_dev(div2, "class", "columns");
    			add_location(div2, file$9, 31, 0, 959);
    			attr_dev(div3, "class", "content");
    			add_location(div3, file$9, 30, 0, 937);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			if_block.m(div2, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, t1);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(3, $user = $$value));
    	let username, password;
    	let errorMessage = "";

    	async function handleLogin() {
    		const res = await fetch("/auth/login", {
    			method: "POST",
    			headers: {
    				"Accept": "application/json",
    				"Content-Type": "application/json"
    			},
    			body: JSON.stringify({ username, password })
    		});

    		let loginResponse = await res.json();

    		if (loginResponse.result == "error") {
    			$$invalidate(2, errorMessage = loginResponse.message);
    		} else {
    			const res = await fetch("/api/checkuser", { credentials: "same-origin" });
    			let stateResponse = await res.json();

    			if (stateResponse.user_id !== "_") {
    				user.set(stateResponse.user_id);
    			} else {
    				user.set("");
    			}
    		}
    	}

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("password" in $$props) $$invalidate(1, password = $$props.password);
    		if ("errorMessage" in $$props) $$invalidate(2, errorMessage = $$props.errorMessage);
    		if ("$user" in $$props) user.set($user = $$props.$user);
    	};

    	return [
    		username,
    		password,
    		errorMessage,
    		$user,
    		handleLogin,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* client/pages/Logout.svelte generated by Svelte v3.16.4 */
    const file$a = "client/pages/Logout.svelte";

    // (19:0) {:else}
    function create_else_block$4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Bye Bye!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:0) {#if $user}
    function create_if_block$5(ctx) {
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			t0 = text("You are still logged in as  ");
    			t1 = text(/*$user*/ ctx[0]);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$user*/ 1) set_data_dev(t1, /*$user*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(17:0) {#if $user}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let div;

    	function select_block_type(ctx, dirty) {
    		if (/*$user*/ ctx[0]) return create_if_block$5;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "content");
    			add_location(div, file$a, 15, 0, 455);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $user;
    	validate_store(user, "user");
    	component_subscribe($$self, user, $$value => $$invalidate(0, $user = $$value));
    	let errorMessage;

    	onMount(async () => {
    		const res = await fetch("/auth/logout", { credentials: "same-origin" });
    		let logoutResponse = await res.json();

    		if (logoutResponse.result == "error") {
    			errorMessage = logoutResponse.message;
    		} else {
    			user.set("");
    		}
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("errorMessage" in $$props) errorMessage = $$props.errorMessage;
    		if ("$user" in $$props) user.set($user = $$props.$user);
    	};

    	return [$user];
    }

    class Logout extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logout",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* client/pages/Secure.svelte generated by Svelte v3.16.4 */
    const file$b = "client/pages/Secure.svelte";

    function create_fragment$b(ctx) {
    	let div;
    	let p;
    	let t0;
    	let br0;
    	let t1;
    	let br1;
    	let t2;
    	let strong0;
    	let t4_value = /*secureContent*/ ctx[0].result + "";
    	let t4;
    	let t5;
    	let br2;
    	let t6;
    	let strong1;
    	let t8_value = /*secureContent*/ ctx[0].message + "";
    	let t8;
    	let t9;
    	let br3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text("This is secret secure area!! ");
    			br0 = element("br");
    			t1 = text("\n    Here's the secret message from the server: \n    ( if you are not logged in, result should be \"error\")");
    			br1 = element("br");
    			t2 = space();
    			strong0 = element("strong");
    			strong0.textContent = "Result: ";
    			t4 = text(t4_value);
    			t5 = space();
    			br2 = element("br");
    			t6 = space();
    			strong1 = element("strong");
    			strong1.textContent = "Message: ";
    			t8 = text(t8_value);
    			t9 = space();
    			br3 = element("br");
    			add_location(br0, file$b, 11, 33, 293);
    			add_location(br1, file$b, 13, 57, 403);
    			add_location(strong0, file$b, 14, 4, 412);
    			add_location(br2, file$b, 14, 52, 460);
    			add_location(strong1, file$b, 15, 4, 469);
    			add_location(br3, file$b, 15, 54, 519);
    			add_location(p, file$b, 10, 0, 256);
    			attr_dev(div, "class", "content");
    			add_location(div, file$b, 8, 0, 233);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, br0);
    			append_dev(p, t1);
    			append_dev(p, br1);
    			append_dev(p, t2);
    			append_dev(p, strong0);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			append_dev(p, br2);
    			append_dev(p, t6);
    			append_dev(p, strong1);
    			append_dev(p, t8);
    			append_dev(p, t9);
    			append_dev(p, br3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*secureContent*/ 1 && t4_value !== (t4_value = /*secureContent*/ ctx[0].result + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*secureContent*/ 1 && t8_value !== (t8_value = /*secureContent*/ ctx[0].message + "")) set_data_dev(t8, t8_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let secureContent = "";

    	onMount(async () => {
    		const res = await fetch("/api/secure", { credentials: "same-origin" });
    		$$invalidate(0, secureContent = await res.json());
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("secureContent" in $$props) $$invalidate(0, secureContent = $$props.secureContent);
    	};

    	return [secureContent];
    }

    class Secure extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Secure",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* client/App.svelte generated by Svelte v3.16.4 */
    const file$c = "client/App.svelte";

    // (30:4) <Route exact path="/">
    function create_default_slot_7(ctx) {
    	let current;
    	const home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(30:4) <Route exact path=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (31:4) <Route path="#about">
    function create_default_slot_6$1(ctx) {
    	let current;
    	const about = new About({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(about.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(about, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(about.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(about.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(about, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6$1.name,
    		type: "slot",
    		source: "(31:4) <Route path=\\\"#about\\\">",
    		ctx
    	});

    	return block;
    }

    // (32:1) <Route path="#app/common" let:router>
    function create_default_slot_5$1(ctx) {
    	let current;
    	const common = new Common({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(common.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(common, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(common.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(common.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(common, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5$1.name,
    		type: "slot",
    		source: "(32:1) <Route path=\\\"#app/common\\\" let:router>",
    		ctx
    	});

    	return block;
    }

    // (33:1) <Route path="#:name" let:router>
    function create_default_slot_4$1(ctx) {
    	let current;
    	const catcher = new Catcher({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(catcher.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(catcher, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(catcher.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(catcher.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(catcher, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4$1.name,
    		type: "slot",
    		source: "(33:1) <Route path=\\\"#:name\\\" let:router>",
    		ctx
    	});

    	return block;
    }

    // (34:1) <Route exact path="#login">
    function create_default_slot_3$1(ctx) {
    	let current;
    	const login = new Login({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(login.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3$1.name,
    		type: "slot",
    		source: "(34:1) <Route exact path=\\\"#login\\\">",
    		ctx
    	});

    	return block;
    }

    // (35:1) <Route exact path="#logout">
    function create_default_slot_2$1(ctx) {
    	let current;
    	const logout = new Logout({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(logout.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(logout, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(logout.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(logout.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(logout, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(35:1) <Route exact path=\\\"#logout\\\">",
    		ctx
    	});

    	return block;
    }

    // (36:1) <Route exact path="#secure">
    function create_default_slot_1$1(ctx) {
    	let current;
    	const secure = new Secure({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(secure.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(secure, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(secure.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(secure.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(secure, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(36:1) <Route exact path=\\\"#secure\\\">",
    		ctx
    	});

    	return block;
    }

    // (29:2) <Router>
    function create_default_slot$1(ctx) {
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let current;

    	const route0 = new Route({
    			props: {
    				exact: true,
    				path: "/",
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route1 = new Route({
    			props: {
    				path: "#about",
    				$$slots: { default: [create_default_slot_6$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route2 = new Route({
    			props: {
    				path: "#app/common",
    				$$slots: {
    					default: [
    						create_default_slot_5$1,
    						({ router }) => ({ 0: router }),
    						({ router }) => [router ? 1 : 0]
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route3 = new Route({
    			props: {
    				path: "#:name",
    				$$slots: {
    					default: [
    						create_default_slot_4$1,
    						({ router }) => ({ 0: router }),
    						({ router }) => [router ? 1 : 0]
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route4 = new Route({
    			props: {
    				exact: true,
    				path: "#login",
    				$$slots: { default: [create_default_slot_3$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route5 = new Route({
    			props: {
    				exact: true,
    				path: "#logout",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const route6 = new Route({
    			props: {
    				exact: true,
    				path: "#secure",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    			t2 = space();
    			create_component(route3.$$.fragment);
    			t3 = space();
    			create_component(route4.$$.fragment);
    			t4 = space();
    			create_component(route5.$$.fragment);
    			t5 = space();
    			create_component(route6.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route3, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(route4, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(route5, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(route6, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route0_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				route0_changes.$$scope = { dirty, ctx };
    			}

    			route0.$set(route0_changes);
    			const route1_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				route1_changes.$$scope = { dirty, ctx };
    			}

    			route1.$set(route1_changes);
    			const route2_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				route2_changes.$$scope = { dirty, ctx };
    			}

    			route2.$set(route2_changes);
    			const route3_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				route3_changes.$$scope = { dirty, ctx };
    			}

    			route3.$set(route3_changes);
    			const route4_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				route4_changes.$$scope = { dirty, ctx };
    			}

    			route4.$set(route4_changes);
    			const route5_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				route5_changes.$$scope = { dirty, ctx };
    			}

    			route5.$set(route5_changes);
    			const route6_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				route6_changes.$$scope = { dirty, ctx };
    			}

    			route6.$set(route6_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			transition_in(route4.$$.fragment, local);
    			transition_in(route5.$$.fragment, local);
    			transition_in(route6.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			transition_out(route6.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(route1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(route2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(route3, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(route4, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(route5, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(route6, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(29:2) <Router>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$c(ctx) {
    	let main;
    	let t0;
    	let t1;
    	let current;
    	const nav = new Nav({ $$inline: true });

    	const router = new Router({
    			props: {
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(nav.$$.fragment);
    			t0 = space();
    			create_component(router.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			add_location(main, file$c, 26, 0, 806);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(nav, main, null);
    			append_dev(main, t0);
    			mount_component(router, main, null);
    			append_dev(main, t1);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const router_changes = {};

    			if (dirty[0] & /*$$scope*/ 2) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(nav);
    			destroy_component(router);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self) {
    	onMount(async () => {
    		const res = await fetch("/api/checkuser", { credentials: "same-origin" });
    		let stateResponse = await res.json();

    		if (stateResponse.user_id !== "_") {
    			user.set(stateResponse.user_id);
    		} else {
    			user.set("");
    		}
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'from Svelte'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
