exports = globalThis.exports;
let node_fs_promises = require("node:fs/promises");
// ../../../packages/lib/src/server/rateLimit.ts
var SourceLock = class {
	active = new Set();
	async run(source, busy, task) {
		if (this.active.has(source)) return busy;
		this.active.add(source);
		try {
			return await task();
		} finally {
			this.active.delete(source);
		}
	}
	release(source) {
		this.active.delete(source);
	}
}, RateLimit = class {
	count;
	windowMs;
	hits = new Map();
	constructor(count, windowMs) {
		this.count = count, this.windowMs = windowMs;
	}
	take(source) {
		let now = GetGameTimer(), recent = (this.hits.get(source) ?? []).filter((at) => now - at < this.windowMs);
		return recent.length >= this.count ? (this.hits.set(source, recent), !1) : (recent.push(now), this.hits.set(source, recent), !0);
	}
	release(source) {
		this.hits.delete(source);
	}
};
// ../../../packages/lib/src/shared/read.ts
function num(value, fallback, min = -Infinity, max = Infinity) {
	return typeof value == "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function int(value, fallback, min = -Infinity, max = Infinity) {
	return Math.round(num(value, fallback, min, max));
}
function bool(value, fallback) {
	return typeof value == "boolean" ? value : fallback;
}
function str(value, fallback, max = 64) {
	return typeof value == "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
function record(value) {
	return typeof value == "object" && value && !Array.isArray(value) ? value : {};
}
function vec4(value, fallback) {
	let v = record(value);
	return {
		x: num(v.x, fallback.x),
		y: num(v.y, fallback.y),
		z: num(v.z, fallback.z),
		heading: num(v.heading, fallback.heading)
	};
}
// ../../../packages/lib/src/shared/index.ts
function isRecord(value) {
	return typeof value == "object" && !!value && !Array.isArray(value);
}
function logSafe(text, max) {
	return text.replace(/\r?\n/g, " | ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\^\d/g, "").slice(0, max);
}
function formatText(template, args) {
	return template.replace(/\{(\d+)\}/g, (match, index) => {
		let value = args[Number(index)];
		return value === void 0 ? match : String(value);
	});
}
const asArgs = (value) => value === null ? null : [value];
function createLogger(resource) {
	let prefix = `[${resource}]`;
	return {
		info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
		warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
		error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
	};
}
function withoutSchemaKey(value) {
	if (!isRecord(value) || !("$schema" in value)) return value;
	let { $schema: _schema, ...rest } = value;
	return rest;
}
var DataFile = class {
	resource;
	name;
	log;
	writes = Promise.resolve();
	pending = void 0;
	timer = null;
	schemaRef = null;
	constructor(resource, name, log) {
		this.resource = resource, this.name = name, this.log = log;
	}
	hasSchemaRef() {
		return (LoadResourceFile(this.resource, this.path) ?? "").includes("\"$schema\"");
	}
	read() {
		for (let path of [this.path, `${this.path}.bak`]) {
			let raw = LoadResourceFile(this.resource, path);
			if (raw) try {
				return withoutSchemaKey(JSON.parse(raw));
			} catch (error) {
				this.log.error(`${this.resource}/${path} is not valid JSON${path === this.path ? ", trying the backup" : ""}`, error);
			}
		}
		return null;
	}
	write(value) {
		this.pending = value, this.timer ||= setTimeout(() => {
			this.timer = null;
			let data = this.schemaRef && isRecord(this.pending) ? {
				$schema: this.schemaRef,
				...this.pending
			} : this.pending, text = `${JSON.stringify(data, null, 2)}\n`;
			this.writes = this.writes.then(() => this.flush(text)).catch((error) => this.log.error(`saving ${this.resource}/${this.path} failed`, error));
		}, 250);
	}
	get path() {
		return `data/${this.name}.json`;
	}
	async flush(text) {
		let file = `${GetResourcePath(this.resource)}/${this.path}`;
		await (0, node_fs_promises.mkdir)(file.slice(0, file.lastIndexOf("/")), { recursive: !0 }), await (0, node_fs_promises.writeFile)(`${file}.tmp`, text, "utf8"), await (0, node_fs_promises.copyFile)(file, `${file}.bak`).catch(() => void 0), await (0, node_fs_promises.rename)(`${file}.tmp`, file);
	}
};
// ../../../packages/shared/src/core.ts
const CORE = {
	resource: "ai-core",
	clientErrorEvent: "ai-core:clientError",
	playerLoadedEvent: "ai-core:playerLoaded",
	playerUnloadedEvent: "ai-core:playerUnloaded",
	moneyChangedEvent: "ai-core:moneyChanged",
	jobsChangedEvent: "ai-core:jobsChanged",
	dutyChangedEvent: "ai-core:dutyChanged",
	gangsChangedEvent: "ai-core:gangsChanged",
	activeGangChangedEvent: "ai-core:activeGangChanged",
	characterScreenEvent: "ai-core:characterScreen",
	inventoryChangedEvent: "ai-core:inventoryChanged",
	itemUsedEvent: "ai-core:itemUsed",
	playerDiedEvent: "ai-core:playerDied",
	clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
	clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
	clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
	clientCharacterLookEvent: "ai-core:client:characterLook",
	clientPromptPressedEvent: "ai-core:client:promptPressed",
	clientCacheEvent: "ai-core:client:cache",
	clientHudVisibleEvent: "ai-core:client:hudVisible",
	vehicleTypeCallback: "ai-core:vehicleType",
	interactionStateKey: "ai:interaction",
	charactersCallback: "ai-core:characters",
	createCharacterCallback: "ai-core:createCharacter",
	deleteCharacterCallback: "ai-core:deleteCharacter",
	selectCharacterCallback: "ai-core:selectCharacter",
	clientNotifyEvent: "ai-core:client:notify",
	spawnEvent: "ai-core:client:spawn",
	openCharactersEvent: "ai-core:client:openCharacters"
}, ADMIN = {
	ace: "ai.admin",
	openCallback: "ai-core:admin:open",
	applyCallback: "ai-core:admin:apply",
	closeEvent: "ai-core:admin:close",
	showEvent: "ai-core:admin:show",
	deltaEvent: "ai-core:admin:delta",
	worldEvent: (resource) => `${resource}:admin:world`,
	worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
};
// ../../../packages/lib/src/fivem/exports.ts
function registerExport(name, handler) {
	globalThis.exports(name, handler);
}
function resourceExport(resource) {
	return globalThis.exports[resource];
}
function isResourceStarted(resource) {
	return GetResourceState(resource) === "started";
}
function optionalExport(resource) {
	return isResourceStarted(resource) ? globalThis.exports[resource] : null;
}
function readLocaleFile(resource, lang) {
	let raw = LoadResourceFile(resource, `locales/${lang}.json`);
	if (!raw) return {};
	let parsed = JSON.parse(raw);
	if (!isRecord(parsed)) return {};
	let texts = {};
	for (let [key, value] of Object.entries(parsed)) typeof value == "string" && (texts[key] = value);
	return texts;
}
function createLocale() {
	let texts = loadLocaleTexts();
	return (key, ...args) => formatText(texts[key] ?? key, args);
}
function loadLocaleTexts(resource = GetCurrentResourceName()) {
	let lang = GetConvar("ai:locale", "en"), texts = {
		...readLocaleFile(resource, "en"),
		...lang === "en" ? {} : readLocaleFile(resource, lang)
	};
	for (let key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
	return texts;
}
// ../../../packages/lib/src/fivem/callbackNames.ts
const requestEvent = (name) => `aicore:cb:${name}`, responseEvent = (resource) => `aicore:cbr:${resource}`;
resourceExport(CORE.resource);
const log$4 = createLogger(GetCurrentResourceName()), gates = new Set();
on("playerDropped", () => {
	let source = Number(globalThis.source);
	for (let gate of gates) gate.release(source);
});
var ClientGate = class {
	name;
	options;
	limit;
	lock;
	constructor(name, options, defaultRate) {
		this.name = name, this.options = options, this.limit = new RateLimit(options.rate?.count ?? defaultRate, options.rate?.windowMs ?? 1e3), this.lock = options.lock ? new SourceLock() : null, gates.add(this);
	}
	check(source, raw) {
		if (!(source > 0) || !GetPlayerName(String(source)) || !this.limit.take(source)) return null;
		for (let guard of this.options.guards ?? []) {
			let verdict = guard(source);
			if (verdict !== !0) return typeof verdict == "string" && this.refuse(source, verdict), null;
		}
		if (!this.options.args) return [];
		let args = this.options.args(raw);
		return args === null && this.refuse(source, `invalid arguments ${logSafe(JSON.stringify(raw) ?? "", 200)}`), args;
	}
	run(source, busy, task) {
		return this.lock ? this.lock.run(source, busy, async () => task()) : Promise.resolve(task());
	}
	release(source) {
		this.limit.release(source), this.lock?.release(source);
	}
	refuse(source, reason) {
		log$4.warn(`${this.name} refused for ${GetPlayerName(String(source))} (${source}): ${reason}`);
	}
};
// ../../../packages/lib/src/server/callback.ts
const log$3 = createLogger(GetCurrentResourceName()), resource$1 = GetCurrentResourceName(), REFUSED = Symbol("refused");
function onClientCallback(name, first, second) {
	let [handler, options] = typeof first == "function" ? [first, second ?? {}] : [second, first], gate = new ClientGate(name, options, 20);
	onNet(requestEvent(name), async (caller, id, ...raw) => {
		let source = Number(globalThis.source);
		if (typeof caller != "string" || caller.length > 64 || typeof id != "number") return;
		let args = gate.check(source, raw);
		if (!args) return emitNet(responseEvent(caller), source, id, !1, null);
		try {
			let result = await gate.run(source, REFUSED, () => handler(source, ...args));
			result === REFUSED ? emitNet(responseEvent(caller), source, id, !1, null) : emitNet(responseEvent(caller), source, id, !0, result ?? null);
		} catch (error) {
			log$3.error(`callback ${name} failed for ${source}`, error), emitNet(responseEvent(caller), source, id, !1, null);
		}
	});
}
const pending = new Map();
onNet(responseEvent(resource$1), (id, ok, result) => {
	let entry = typeof id == "number" ? pending.get(id) : void 0;
	entry && entry.source === Number(globalThis.source) && (pending.delete(id), clearTimeout(entry.timer), ok === !0 ? entry.resolve(result) : entry.reject(Error("client callback failed")));
});
// ../../../packages/lib/src/server/admin/patch.ts
function toPatch(value) {
	if (!isRecord(value) || typeof value.file != "string") return null;
	let key = typeof value.key == "string" ? value.key : void 0;
	switch (value.action) {
		case "set": return typeof value.section == "string" ? {
			file: value.file,
			action: "set",
			key,
			section: value.section,
			value: value.value
		} : null;
		case "create": return key && typeof value.label == "string" ? {
			file: value.file,
			action: "create",
			key,
			label: value.label
		} : null;
		case "delete": return key ? {
			file: value.file,
			action: "delete",
			key
		} : null;
		case "import": {
			if (!isRecord(value.records)) return null;
			let records = {};
			for (let [k, v] of Object.entries(value.records)) isRecord(v) && (records[k] = v);
			return Object.keys(records).length > 0 && Object.keys(records).length <= 500 ? {
				file: value.file,
				action: "import",
				records
			} : null;
		}
		default: return null;
	}
}
const clone = (value) => value === void 0 ? value : JSON.parse(JSON.stringify(value)), core$6 = resourceExport(CORE.resource), ERR = {
	type: "ADMIN_ERR_TYPE",
	range: "ADMIN_ERR_RANGE",
	length: "ADMIN_ERR_LENGTH",
	pattern: "ADMIN_ERR_PATTERN",
	required: "ADMIN_ERR_REQUIRED",
	lookup: "ADMIN_ERR_LOOKUP"
}, lookups = new class {
	lists = new Map();
	values(source) {
		let cached = this.lists.get(source);
		if (cached && Date.now() - cached.at < 2e3) return cached.values.size > 0 ? cached.values : null;
		let list = [];
		try {
			list = core$6.GetLookupValues(source);
		} catch {}
		let values = new Set(Array.isArray(list) ? list.filter((v) => typeof v == "string") : []);
		return this.lists.set(source, {
			at: Date.now(),
			values
		}), values.size > 0 ? values : null;
	}
}(), isVec = (value, keys) => isRecord(value) && keys.every((k) => typeof value[k] == "number" && Number.isFinite(value[k]));
function validate(spec, value, path) {
	if (value == null) return spec.optional ? null : {
		error: ERR.required,
		path
	};
	let fail = (error) => ({
		error,
		path
	});
	switch (spec.type) {
		case "text": return typeof value == "string" ? value.length < (spec.min ?? 1) || value.length > (spec.max ?? 120) ? fail(ERR.length) : spec.pattern && !new RegExp(spec.pattern).test(value) ? fail(ERR.pattern) : spec.lookup && value !== "" && lookups.values(spec.lookup)?.has(value) === !1 ? fail(ERR.lookup) : null : fail(ERR.type);
		case "number": return typeof value != "number" || !Number.isFinite(value) || spec.integer && !Number.isInteger(value) ? fail(ERR.type) : spec.min !== void 0 && value < spec.min || spec.max !== void 0 && value > spec.max ? fail(ERR.range) : null;
		case "bool": return typeof value == "boolean" ? null : fail(ERR.type);
		case "enum": return spec.values.includes(value) ? null : fail(ERR.type);
		case "names": {
			if (!Array.isArray(value) || value.length > (spec.max ?? 50)) return fail(ERR.length);
			let pattern = new RegExp(spec.pattern ?? "^[\\w.:-]+$"), seen = new Set();
			for (let name of value) {
				if (typeof name != "string" || name.length > (spec.itemMax ?? 64) || seen.has(name)) return fail(ERR.type);
				if (!pattern.test(name)) return fail(ERR.pattern);
				if (spec.lookup && lookups.values(spec.lookup)?.has(name) === !1) return fail(ERR.lookup);
				seen.add(name);
			}
			return null;
		}
		case "vec3": return isVec(value, [
			"x",
			"y",
			"z"
		]) ? null : fail(ERR.type);
		case "vec4": return isVec(value, [
			"x",
			"y",
			"z",
			"heading"
		]) ? null : fail(ERR.type);
		case "object":
			if (!isRecord(value)) return fail(ERR.type);
			for (let key of Object.keys(value)) if (!(key in spec.fields)) return {
				error: ERR.type,
				path: `${path}.${key}`
			};
			for (let [key, field] of Object.entries(spec.fields)) {
				let refusal = validate(field, value[key], `${path}.${key}`);
				if (refusal) return refusal;
			}
			return null;
		case "list":
			if (!Array.isArray(value)) return fail(ERR.type);
			if (value.length < (spec.min ?? 0) || value.length > (spec.max ?? 100)) return fail(ERR.length);
			for (let i = 0; i < value.length; i++) {
				let refusal = validate(spec.of, value[i], `${path}.${i + 1}`);
				if (refusal) return refusal;
			}
			return null;
		default: return spec;
	}
}
// ../../../packages/lib/src/server/admin/jsonSchema.ts
const SCHEMA_KEY = {
	type: "string",
	description: "This file's JSON Schema (for editors)."
};
function langFile(resource) {
	try {
		let raw = JSON.parse(LoadResourceFile(resource, "locales/en.json") ?? "{}");
		return isRecord(raw) ? Object.fromEntries(Object.entries(raw).filter((e) => typeof e[1] == "string")) : {};
	} catch {
		return {};
	}
}
function texts(resource) {
	return {
		...langFile("ai-core"),
		...langFile(resource)
	};
}
function collect(fields, prefix, lang, out) {
	for (let field of fields) {
		let path = prefix + field.path, label = lang[field.label] ?? field.label, hint = field.hint ? lang[field.hint] ?? field.hint : "";
		out.has(path) || out.set(path, hint ? `${label}: ${hint}` : label), field.widget === "list" && collect(field.rows, `${path}[].`, lang, out);
	}
}
function describe(schema, file, lang) {
	let out = new Map();
	for (let tab of schema.tabs) if (tab.file === file) for (let card of tab.cards) collect(card.fields, "", lang, out);
	return out;
}
function toJson(spec, path, desc) {
	let description = desc.get(path), base = description ? { description } : {};
	switch (spec.type) {
		case "text": return {
			...base,
			type: "string",
			minLength: spec.min,
			maxLength: spec.max,
			pattern: spec.pattern
		};
		case "number": return {
			...base,
			type: spec.integer ? "integer" : "number",
			minimum: spec.min,
			maximum: spec.max
		};
		case "bool": return {
			...base,
			type: "boolean"
		};
		case "enum": return {
			...base,
			enum: spec.values
		};
		case "names": return {
			...base,
			type: "array",
			maxItems: spec.max,
			uniqueItems: !0,
			items: {
				type: "string",
				maxLength: spec.itemMax,
				pattern: spec.pattern
			}
		};
		case "vec3":
		case "vec4": {
			let keys = spec.type === "vec3" ? [
				"x",
				"y",
				"z"
			] : [
				"x",
				"y",
				"z",
				"heading"
			];
			return {
				...base,
				type: "object",
				required: keys,
				properties: Object.fromEntries(keys.map((k) => [k, { type: "number" }]))
			};
		}
		case "object": return {
			...base,
			...objectOf(spec.fields, path ? `${path}.` : "", desc)
		};
		case "list": return {
			...base,
			type: "array",
			minItems: spec.min,
			maxItems: spec.max,
			items: toJson(spec.of, `${path}[]`, desc)
		};
		default: return spec;
	}
}
function objectOf(fields, prefix, desc) {
	return {
		type: "object",
		properties: Object.fromEntries(Object.entries(fields).map(([k, s]) => [k, toJson(s, prefix + k, desc)])),
		required: Object.entries(fields).filter(([, s]) => !s.optional).map(([k]) => k)
	};
}
function fileSchema(resource, schema, name, spec) {
	let desc = describe(schema, name, texts(resource)), title = `${resource}/data/${name}.json`, body = spec.kind === "settings" ? (() => {
		let obj = objectOf(spec.sections, "", desc), required = obj.required.filter((k) => !(k in (spec.defaults ?? {})));
		return {
			...obj,
			properties: {
				$schema: SCHEMA_KEY,
				...obj.properties
			},
			required
		};
	})() : {
		type: "object",
		properties: { $schema: SCHEMA_KEY },
		patternProperties: { [spec.keyPattern ?? "^[a-z0-9_]{2,32}$"]: objectOf(spec.sections, "", desc) },
		additionalProperties: !1
	};
	return `${JSON.stringify({
		$schema: "http://json-schema.org/draft-07/schema#",
		title,
		...body
	}, null, 2)}\n`;
}
function writeSchema(resource, name, text, log) {
	let path = `data/schemas/${name}.schema.json`;
	if (LoadResourceFile(resource, path) === text) return;
	let dir = `${GetResourcePath(resource)}/data/schemas`;
	(0, node_fs_promises.mkdir)(dir, { recursive: !0 }).then(() => (0, node_fs_promises.writeFile)(`${dir}/${name}.schema.json`, text, "utf8")).catch((error) => log.error(`writing ${resource}/${path} failed`, error));
}
// ../../../packages/lib/src/server/admin/panel.ts
const core$5 = resourceExport(CORE.resource), DEFAULT_KEY = "^[a-z0-9_]{2,32}$";
function imported(spec, value) {
	let base = clone(spec.newRecord ?? {}), out = {};
	for (let name of Object.keys(spec.sections)) {
		let v = name in value ? value[name] : base[name];
		v !== void 0 && (out[name] = clone(v));
	}
	return out;
}
var AdminPanel = class {
	schema;
	data = new Map();
	dataFiles = new Map();
	handlers = new Map();
	rules = new Map();
	worldChanges = new Map();
	resource = GetCurrentResourceName();
	log = createLogger(this.resource);
	constructor(schema) {
		this.schema = schema;
		for (let [name, spec] of Object.entries(schema.files)) this.load(name, spec);
		registerExport("AdminPanelSnapshot", () => this.snapshot()), registerExport("AdminPanelApply", (admin, patch) => this.apply(admin, patch)), onClientCallback(ADMIN.worldChangesCallback(this.resource), () => Object.fromEntries(this.worldChanges)), setImmediate(() => core$5.RegisterAdminPanel(this.resource));
	}
	get(file) {
		return this.data.get(file) ?? {};
	}
	onChange(file, handler) {
		this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
	}
	rule(file, rule) {
		this.rules.set(file, rule);
	}
	snapshot() {
		return {
			resource: this.resource,
			schema: this.schema,
			texts: loadLocaleTexts(),
			data: clone(Object.fromEntries(this.data))
		};
	}
	apply(admin, raw) {
		let patch = toPatch(raw), spec = patch ? this.schema.files[patch.file] : void 0;
		if (!patch || !spec || spec.memory) return {
			ok: !1,
			error: ERR.type
		};
		let error = this.check(patch, spec);
		return error ? (this.log.warn(`admin ${admin} edit refused (${error}): ${JSON.stringify(patch).slice(0, 300)}`), {
			ok: !1,
			error
		}) : (this.store(patch, spec), { ok: !0 });
	}
	commit(file, key, value) {
		let data = this.data.get(file);
		data && (key === void 0 ? isRecord(value) && this.data.set(file, clone(value)) : value === null ? delete data[key] : data[key] = clone(value), this.changed(file, key));
	}
	check(patch, spec) {
		let data = this.get(patch.file);
		if (patch.action === "create") return spec.kind !== "records" || !new RegExp(spec.keyPattern ?? DEFAULT_KEY).test(patch.key) ? ERR.pattern : patch.key in data ? "ADMIN_ERR_EXISTS" : null;
		if (patch.action === "delete") return spec.kind !== "records" || !(patch.key in data) ? ERR.type : spec.locked?.includes(patch.key) ? "ADMIN_ERR_LOCKED" : null;
		if (patch.action === "import") {
			if (spec.kind !== "records") return ERR.type;
			let pattern = new RegExp(spec.keyPattern ?? DEFAULT_KEY);
			for (let [key, value] of Object.entries(patch.records)) {
				if (!pattern.test(key)) return ERR.pattern;
				let record = imported(spec, value);
				for (let [name, section] of Object.entries(spec.sections)) {
					let refusal = validate(section, record[name], name);
					if (refusal) return refusal.error;
				}
				let ruled = this.rules.get(patch.file)?.(key, record);
				if (ruled) return ruled;
			}
			return null;
		}
		let section = spec.sections[patch.section];
		if (!section || spec.kind === "records" && (!patch.key || !(patch.key in data))) return ERR.type;
		let refusal = validate(section, patch.value, patch.section);
		if (refusal) return refusal.error;
		let current = spec.kind === "records" ? data[patch.key ?? ""] : data, next = {
			...isRecord(current) ? current : {},
			[patch.section]: patch.value
		};
		return this.rules.get(patch.file)?.(patch.key, next) ?? null;
	}
	store(patch, spec) {
		let data = this.data.get(patch.file) ?? {};
		if (patch.action === "create") {
			let record = clone(spec.newRecord ?? {});
			spec.labelPath && (record[spec.labelPath] = patch.label), data[patch.key] = record;
		} else if (patch.action === "delete") delete data[patch.key];
		else if (patch.action === "import") {
			for (let [key, value] of Object.entries(patch.records)) data[key] = imported(spec, value);
			this.data.set(patch.file, data);
			for (let key of Object.keys(patch.records)) this.changed(patch.file, key);
			return;
		} else {
			let target = spec.kind === "records" ? data[patch.key ?? ""] : data;
			if (!isRecord(target)) return;
			patch.value === void 0 || patch.value === null ? delete target[patch.section] : target[patch.section] = clone(patch.value);
		}
		this.data.set(patch.file, data), this.changed(patch.file, spec.kind === "records" ? patch.key : void 0);
	}
	changed(file, key) {
		let spec = this.schema.files[file], data = this.get(file), value = key === void 0 ? data : data[key] ?? null;
		this.dataFiles.get(file)?.write(data);
		for (let handler of this.handlers.get(file) ?? []) handler(key, value);
		if (core$5.AdminPanelChanged({
			resource: this.resource,
			file,
			key,
			value: clone(value)
		}), spec?.sync !== "all") return;
		let changes = this.worldChanges.get(file) ?? {};
		changes[key ?? ""] = clone(value), this.worldChanges.set(file, changes), emitNet(ADMIN.worldEvent(this.resource), -1, file, key ?? null, value);
	}
	load(name, spec) {
		if (spec.memory) {
			this.data.set(name, {});
			return;
		}
		let file = new DataFile(this.resource, name, this.log);
		this.dataFiles.set(name, file), file.schemaRef = `./schemas/${name}.schema.json`, writeSchema(this.resource, name, fileSchema(this.resource, this.schema, name, spec), this.log);
		let raw = file.read(), data = isRecord(raw) ? raw : {}, filled = !1;
		if (spec.kind === "settings") for (let [section, value] of Object.entries(spec.defaults ?? {})) section in data || (data[section] = clone(value), filled = !0);
		this.data.set(name, data), (filled || raw === null || !file.hasSchemaRef()) && file.write(data);
	}
};
// ../../../packages/lib/src/server/inventory.ts
const core$4 = resourceExport(CORE.resource), inventory = {
	addItem: (inv, item, count = 1, metadata, slot) => core$4.AddItem(inv, item, count, metadata, slot),
	removeItem: (inv, item, count = 1, metadata, slot) => core$4.RemoveItem(inv, item, count, metadata, slot),
	getItemCount: (inv, item, metadata) => core$4.GetItemCount(inv, item, metadata),
	hasItem: (inv, item, count = 1) => core$4.HasItem(inv, item, count),
	canCarryItem: (inv, item, count = 1, metadata) => core$4.CanCarryItem(inv, item, count, metadata),
	getItems: (inv) => core$4.GetItems(inv),
	clearInventory: (inv) => core$4.ClearInventory(inv),
	registerStash: (name, label, slots, maxWeight, jobs = []) => core$4.RegisterStash(name, label, slots, maxWeight, jobs),
	openInventory: (source, inv) => core$4.OpenInventory(source, inv),
	registerUsableItem: (name, handler) => core$4.RegisterUsableItem(name, handler),
	getItemDefinition: (name) => core$4.GetItemDefinition(name)
}, core$3 = resourceExport(CORE.resource);
var OnlinePlayers = class {
	players = new Map();
	onDuty = new Map();
	started = !1;
	start() {
		if (this.started) return;
		this.started = !0;
		let load = (source, character) => {
			this.put(source, character, (core$3.GetJobs(source) ?? []).map((m) => m.job), (core$3.GetGangs(source) ?? []).map((m) => m.gang)), this.setDuty(source, core$3.GetDutyJob(source));
		};
		on(CORE.playerLoadedEvent, load), on(CORE.playerUnloadedEvent, (source) => this.drop(source)), on(CORE.jobsChangedEvent, (source, jobs) => {
			let player = this.players.get(source);
			player && (player.jobs = jobs.map((m) => m.job));
		}), on(CORE.gangsChangedEvent, (source, gangs) => {
			let player = this.players.get(source);
			player && (player.gangs = gangs.map((m) => m.gang));
		}), on(CORE.dutyChangedEvent, (source, job) => this.setDuty(source, job));
		for (let source of core$3.GetLoadedSources()) {
			let character = core$3.GetCharacter(source);
			character && load(source, character);
		}
	}
	put(source, character, jobs, gangs) {
		this.drop(source), this.players.set(source, {
			character,
			jobs,
			gangs,
			duty: null
		});
	}
	drop(source) {
		this.setDuty(source, null), this.players.delete(source);
	}
	setDuty(source, job) {
		let player = this.players.get(source);
		if (!player || (player.duty && this.onDuty.get(player.duty)?.delete(source), player.duty = job, !job)) return;
		let set = this.onDuty.get(job);
		set || this.onDuty.set(job, set = new Set()), set.add(source);
	}
	sources() {
		return this.start(), this.players.keys();
	}
	get size() {
		return this.start(), this.players.size;
	}
	character(source) {
		return this.start(), this.players.get(source)?.character ?? null;
	}
	jobs(source) {
		return this.start(), this.players.get(source)?.jobs ?? [];
	}
	gangs(source) {
		return this.start(), this.players.get(source)?.gangs ?? [];
	}
	dutyJob(source) {
		return this.start(), this.players.get(source)?.duty ?? null;
	}
	onDutyFor(job) {
		return this.start(), this.onDuty.get(job) ?? EMPTY;
	}
};
const EMPTY = new Set(), online = new OnlinePlayers();
resourceExport(CORE.resource), resourceExport(CORE.resource);
// ../../../packages/lib/src/server/command.ts
const resource = GetCurrentResourceName();
createLogger(resource), new class {
	list = [];
	sent = new Map();
	announced = 0;
	queued = !1;
	listening = !1;
	add(command) {
		this.listening || this.listen(), this.list.push(command), this.queued || (this.queued = !0, setImmediate(() => this.flush()));
	}
	refresh(source) {
		let before = this.sent.get(source), now = new Set(), add = [];
		for (let command of this.list) for (let name of command.info.names) command.allowed(source, name) && (now.add(name), before?.has(name) || add.push(command.suggestion(name)));
		if (this.sent.set(source, now), add.length && emitNet("chat:addSuggestions", source, add), before) for (let name of before) now.has(name) || emitNet("chat:removeSuggestion", source, `/${name}`);
	}
	flush() {
		this.queued = !1, optionalExport(CORE.resource)?.RegisterCommands(resource, this.list.slice(this.announced).map((c) => c.info)), this.announced = this.list.length;
		for (let player of getPlayers()) this.refresh(Number(player));
	}
	listen() {
		this.listening = !0;
		let refresh = (source) => this.refresh(Number(source));
		on(CORE.playerLoadedEvent, refresh), on(CORE.jobsChangedEvent, refresh), on(CORE.gangsChangedEvent, refresh), on("playerDropped", () => this.sent.delete(Number(globalThis.source))), on("onResourceStop", (name) => {
			if (name === resource) for (let command of this.list) for (let n of command.info.names) emitNet("chat:removeSuggestion", -1, `/${n}`);
		});
	}
}();
// ../../../packages/lib/src/server/netEvent.ts
const log$1 = createLogger(GetCurrentResourceName());
function onClientEvent(name, first, second) {
	let [handler, options] = typeof first == "function" ? [first, second ?? {}] : [second, first], gate = new ClientGate(name, options, 10);
	onNet(name, (...raw) => {
		let source = Number(globalThis.source), args = gate.check(source, raw);
		args && gate.run(source, void 0, () => handler(source, ...args)).catch((error) => log$1.error(`event ${name} failed for ${source}`, error));
	});
}
createLogger("aicore-lib");
// ../../../packages/lib/src/fivem/state.ts
const stateString = (v) => typeof v == "string" ? v : void 0, isServer = IsDuplicityVersion();
var Mirror = class {
	key;
	parse;
	values = new Map();
	listeners = new Set();
	constructor(key, parse) {
		this.key = key, this.parse = parse;
	}
	onChange(listener) {
		return this.listeners.add(listener), () => this.listeners.delete(listener);
	}
	store(id, raw) {
		this.apply(id, raw == null ? void 0 : this.parse(raw));
	}
	apply(id, value) {
		let old = this.values.get(id);
		if (this.values.set(id, value), old !== value) for (let listener of this.listeners) listener(id, value, old);
	}
}, PlayerState$1 = class extends Mirror {
	seen = new Set();
	constructor(key, parse) {
		super(key, parse), AddStateBagChangeHandler(key, "", (bag, _key, value) => {
			if (!bag.startsWith("player:")) return;
			let id = Number(bag.slice(7));
			this.seen.add(id), this.store(id, value);
		}), isServer && on("playerDropped", () => this.forget(Number(globalThis.source)));
	}
	get(serverId) {
		if (!this.seen.has(serverId)) {
			this.seen.add(serverId);
			let raw = Player(serverId).state[this.key];
			this.values.set(serverId, raw == null ? void 0 : this.parse(raw));
		}
		return this.values.get(serverId);
	}
	put(serverId, value) {
		this.seen.add(serverId), this.apply(serverId, value);
	}
	forget(serverId) {
		this.values.delete(serverId), this.seen.delete(serverId);
	}
}, PlayerState = class extends PlayerState$1 {
	set(source, value) {
		Player(source).state.set(this.key, value ?? null, !0), this.put(source, value);
	}
};
// resource/common/locale.ts
const Locale = createLocale();
GetCurrentResourceName(), IsDuplicityVersion();
// resource/common/small.ts
const EVENTS = {
	tackle: "ai-smallresources:tackle",
	tackled: "ai-smallresources:client:tackled",
	teleport: "ai-smallresources:teleport",
	binoculars: "ai-smallresources:client:binoculars",
	fireworkPlace: "ai-smallresources:client:fireworkPlace",
	fireworkPlaced: "ai-smallresources:fireworkPlaced",
	firework: "ai-smallresources:client:firework"
};
function readSettings(raw) {
	let v = record(raw);
	return {
		seatbelt: bool(v.seatbelt, !0),
		ejectUnbelted: int(v.ejectUnbelted, 20, 0, 500),
		ejectBelted: int(v.ejectBelted, 160, 0, 500),
		cruise: bool(v.cruise, !0),
		crouch: bool(v.crouch, !0),
		noShuffle: bool(v.noShuffle, !0),
		noDispatch: bool(v.noDispatch, !0),
		hideHud: bool(v.hideHud, !0),
		tackle: bool(v.tackle, !0),
		afkMinutes: int(v.afkMinutes, 20, 0, 600),
		binoculars: bool(v.binoculars, !0),
		fireworks: bool(v.fireworks, !0)
	};
}
function readTeleports(raw) {
	let out = new Map(), zero = {
		x: 0,
		y: 0,
		z: 0,
		heading: 0
	};
	for (let [id, value] of Object.entries(record(raw))) {
		let v = record(value);
		out.set(id, {
			id,
			label: str(v.label, id, 48),
			from: vec4(v.from, zero),
			to: vec4(v.to, zero),
			job: str(v.job, "", 32)
		});
	}
	return out;
}
const NEWS_ITEMS = {
	newscam: {
		model: "prop_v_cam_01",
		bone: 28422,
		offset: [
			0,
			0,
			0,
			0,
			0,
			0
		],
		dict: "missfinale_c2mcs_1",
		clip: "fin_c2_mcs_1_camman"
	},
	newsmic: {
		model: "p_ing_microphonel_01",
		bone: 60309,
		offset: [
			.055,
			.05,
			0,
			240,
			0,
			0
		],
		dict: "missheistdocksprep1hold_cellphone",
		clip: "hold_cellphone"
	},
	newsboom: {
		model: "prop_v_bmike_01",
		bone: 28422,
		offset: [
			-.08,
			0,
			0,
			0,
			0,
			0
		],
		dict: "missfra1",
		clip: "mcs2_crew_idle_m_boom"
	}
}, FIREWORKS = {
	firework1: {
		asset: "proj_indep_firework",
		effects: [
			"scr_indep_firework_grd_burst",
			"scr_indep_launcher_sparkle_spawn",
			"scr_indep_firework_air_burst",
			"proj_indep_flare_trail"
		]
	},
	firework2: {
		asset: "proj_indep_firework_v2",
		effects: [
			"scr_firework_indep_burst_rwb",
			"scr_firework_indep_spiral_burst_rwb",
			"scr_xmas_firework_sparkle_spawn",
			"scr_firework_indep_ring_burst_rwb",
			"scr_firework_indep_repeat_burst_rwb"
		]
	},
	firework3: {
		asset: "proj_xmas_firework",
		effects: [
			"scr_firework_xmas_ring_burst_rgw",
			"scr_firework_xmas_burst_rgw",
			"scr_firework_xmas_repeat_burst_rgw",
			"scr_firework_xmas_spiral_burst_rgw",
			"scr_xmas_firework_sparkle_spawn"
		]
	},
	firework4: {
		asset: "scr_indep_fireworks",
		effects: [
			"scr_indep_firework_sparkle_spawn",
			"scr_indep_firework_starburst",
			"scr_indep_firework_shotburst",
			"scr_indep_firework_trailburst",
			"scr_indep_firework_fountain"
		]
	}
}, smallSchema = {
	title: "ADMIN_TITLE",
	icon: "sliders",
	files: {
		settings: {
			kind: "settings",
			sync: "all",
			sections: {
				seatbelt: { type: "bool" },
				ejectUnbelted: {
					type: "number",
					min: 0,
					max: 500,
					integer: !0
				},
				ejectBelted: {
					type: "number",
					min: 0,
					max: 500,
					integer: !0
				},
				cruise: { type: "bool" },
				crouch: { type: "bool" },
				noShuffle: { type: "bool" },
				noDispatch: { type: "bool" },
				hideHud: { type: "bool" },
				tackle: { type: "bool" },
				afkMinutes: {
					type: "number",
					min: 0,
					max: 600,
					integer: !0
				},
				binoculars: { type: "bool" },
				fireworks: { type: "bool" }
			}
		},
		teleports: {
			kind: "records",
			sync: "all",
			labelPath: "label",
			newRecord: {
				label: "",
				from: {
					x: 0,
					y: 0,
					z: 0,
					heading: 0
				},
				to: {
					x: 0,
					y: 0,
					z: 0,
					heading: 0
				},
				job: ""
			},
			sections: {
				label: {
					type: "text",
					min: 1,
					max: 48
				},
				from: { type: "vec4" },
				to: { type: "vec4" },
				job: {
					type: "text",
					lookup: "job",
					min: 0,
					max: 32
				}
			}
		}
	},
	tabs: [{
		id: "settings",
		file: "settings",
		icon: "sliders",
		label: "ADMIN_TAB_SETTINGS",
		desc: "ADMIN_TAB_SETTINGS_DESC",
		cards: [
			{
				icon: "car",
				title: "ADMIN_C_DRIVING",
				desc: "ADMIN_C_DRIVING_DESC",
				fields: [
					{
						widget: "switch",
						path: "seatbelt",
						label: "ADMIN_F_SEATBELT",
						hint: "ADMIN_H_SEATBELT"
					},
					{
						widget: "number",
						path: "ejectUnbelted",
						label: "ADMIN_F_EJECT_UNBELTED",
						hint: "ADMIN_H_EJECT",
						min: 0,
						max: 500,
						unit: "km/h"
					},
					{
						widget: "number",
						path: "ejectBelted",
						label: "ADMIN_F_EJECT_BELTED",
						min: 0,
						max: 500,
						unit: "km/h"
					},
					{
						widget: "switch",
						path: "cruise",
						label: "ADMIN_F_CRUISE",
						hint: "ADMIN_H_CRUISE"
					},
					{
						widget: "switch",
						path: "noShuffle",
						label: "ADMIN_F_NO_SHUFFLE",
						hint: "ADMIN_H_NO_SHUFFLE"
					}
				]
			},
			{
				icon: "user",
				title: "ADMIN_C_PLAYER",
				desc: "ADMIN_C_PLAYER_DESC",
				fields: [
					{
						widget: "switch",
						path: "crouch",
						label: "ADMIN_F_CROUCH",
						hint: "ADMIN_H_CROUCH"
					},
					{
						widget: "switch",
						path: "tackle",
						label: "ADMIN_F_TACKLE",
						hint: "ADMIN_H_TACKLE"
					},
					{
						widget: "switch",
						path: "binoculars",
						label: "ADMIN_F_BINOCULARS",
						hint: "ADMIN_H_BINOCULARS"
					},
					{
						widget: "switch",
						path: "fireworks",
						label: "ADMIN_F_FIREWORKS",
						hint: "ADMIN_H_FIREWORKS"
					},
					{
						widget: "number",
						path: "afkMinutes",
						label: "ADMIN_F_AFK",
						hint: "ADMIN_H_AFK",
						min: 0,
						max: 600,
						unit: "min"
					}
				]
			},
			{
				icon: "map-location-dot",
				title: "ADMIN_C_WORLD",
				desc: "ADMIN_C_WORLD_DESC",
				fields: [{
					widget: "switch",
					path: "noDispatch",
					label: "ADMIN_F_NO_DISPATCH",
					hint: "ADMIN_H_NO_DISPATCH"
				}, {
					widget: "switch",
					path: "hideHud",
					label: "ADMIN_F_HIDE_HUD",
					hint: "ADMIN_H_HIDE_HUD"
				}]
			}
		]
	}, {
		id: "teleports",
		file: "teleports",
		icon: "location-dot",
		label: "ADMIN_TAB_TELEPORTS",
		desc: "ADMIN_TAB_TELEPORTS_DESC",
		listSub: "job",
		createLabel: "ADMIN_NEW_TELEPORT",
		deleteLabel: "ADMIN_DELETE_TELEPORT",
		cards: [{
			icon: "location-dot",
			title: "ADMIN_C_TELEPORT",
			desc: "ADMIN_C_TELEPORT_DESC",
			fields: [
				{
					widget: "text",
					path: "label",
					suggest: { from: "from" },
					label: "ADMIN_F_LABEL",
					placeholder: "ADMIN_P_LABEL"
				},
				{
					widget: "point",
					path: "from",
					label: "ADMIN_F_FROM",
					heading: !0,
					ground: !0
				},
				{
					widget: "point",
					path: "to",
					label: "ADMIN_F_TO",
					heading: !0,
					ground: !0
				},
				{
					widget: "text",
					lookup: "job",
					path: "job",
					label: "ADMIN_F_JOB",
					hint: "ADMIN_H_JOB",
					placeholder: "ADMIN_P_JOB"
				}
			]
		}]
	}]
}, hold = new PlayerState("aiHold", stateString), core = resourceExport("ai-core"), panel = new AdminPanel(smallSchema), content = {
	settings: readSettings(panel.get("settings")),
	teleports: readTeleports(panel.get("teleports"))
};
panel.onChange("settings", () => content.settings = readSettings(panel.get("settings"))), panel.onChange("teleports", () => content.teleports = readTeleports(panel.get("teleports")));
const fail = (error) => ({
	ok: !1,
	error
}), pos = (source) => {
	let [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
	return {
		x,
		y,
		z
	};
}, dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
onClientEvent(EVENTS.tackle, {
	args: ([target]) => asArgs(typeof target == "number" && Number.isInteger(target) ? target : null),
	rate: {
		count: 1,
		windowMs: 3e3
	}
}, (source, target) => {
	content.settings.tackle && target !== source && GetPlayerName(String(target)) && dist(pos(source), pos(target)) <= 3 && emitNet(EVENTS.tackled, target);
}), onClientCallback(EVENTS.teleport, {
	args: ([id, end]) => typeof id == "string" && (end === "from" || end === "to") ? [id, end] : null,
	lock: !0
}, (source, id, end) => {
	let teleport = content.teleports.get(id);
	if (!teleport || dist(pos(source), teleport[end]) > 3) return fail("SMALL_ERR_FAR");
	if (teleport.job && !(core.GetJobs(source) ?? []).some((m) => m.job === teleport.job)) return fail("SMALL_ERR_JOB");
	let to = end === "from" ? teleport.to : teleport.from, ped = GetPlayerPed(String(source));
	return SetEntityCoords(ped, to.x, to.y, to.z, !1, !1, !1, !1), SetEntityHeading(ped, to.heading), { ok: !0 };
});
const placing = new Map();
let nextToken = 0;
onClientCallback(EVENTS.fireworkPlaced, {
	args: ([token]) => asArgs(typeof token == "number" ? token : null),
	lock: !0
}, (source, token) => {
	let place = placing.get(source);
	if (!place || place.token !== token || (placing.delete(source), Date.now() - place.startedAt < 2400 || !inventory.removeItem(source, place.item, 1))) return fail("SMALL_ERR_FAR");
	let p = pos(source);
	for (let player of getPlayers()) dist(pos(Number(player)), p) <= 400 && emitNet(EVENTS.firework, Number(player), p.x, p.y, p.z - .9, place.item);
	return { ok: !0 };
});
function registerItems() {
	inventory.registerUsableItem("binoculars", (source) => (content.settings.binoculars && emitNet(EVENTS.binoculars, source), !1));
	for (let item of Object.keys(NEWS_ITEMS)) inventory.registerUsableItem(item, (source) => (hold.set(source, hold.get(source) === item ? void 0 : item), !1));
	for (let item of Object.keys(FIREWORKS)) inventory.registerUsableItem(item, (source) => {
		if (!content.settings.fireworks || GetVehiclePedIsIn(GetPlayerPed(String(source)), !1)) return !1;
		let token = ++nextToken;
		return placing.set(source, {
			token,
			item,
			startedAt: Date.now()
		}), emitNet(EVENTS.fireworkPlace, source, token), !1;
	});
}
registerItems();
const still = new Map();
setInterval(() => {
	let minutes = content.settings.afkMinutes;
	if (minutes <= 0) return still.clear();
	let now = Date.now();
	for (let source of online.sources()) {
		let p = pos(source), last = still.get(source);
		!last || dist(last, p) > 1 ? still.set(source, {
			...p,
			since: now
		}) : now - last.since < minutes * 6e4 || IsPlayerAceAllowed(String(source), "ai.admin") || (still.delete(source), DropPlayer(String(source), Locale("SMALL_AFK_KICK", minutes)));
	}
}, 6e4), on("playerDropped", () => {
	let source = Number(globalThis.source);
	still.delete(source), placing.delete(source);
});
