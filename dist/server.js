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
// ../../../packages/lib/src/shared/strict.ts
function readInt(value, min, max) {
	return Number.isInteger(value) && value >= min && value <= max ? value : null;
}
const readId = (value) => readInt(value, 1, 2147483647);
function readText(value, max) {
	if (typeof value != "string") return null;
	let text = value.trim();
	return text ? text.slice(0, max) : null;
}
const oneArg = (read) => ([value]) => {
	let parsed = read(value);
	return parsed === null ? null : [parsed];
}, fail = (error) => ({
	ok: !1,
	error
}), distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z), isObject = (value) => typeof value == "object" && !!value && !Array.isArray(value);
function readRecords(raw, readOne) {
	let out = new Map();
	if (!isObject(raw)) return out;
	for (let key in raw) {
		let value = raw[key];
		if (!isObject(value)) continue;
		let parsed = readOne(key, value);
		parsed !== null && out.set(key, parsed);
	}
	return out;
}
var FileViews = class {
	read;
	updaters = new Map();
	constructor(read) {
		this.read = read;
	}
	view(file, parse) {
		let box = { value: parse(this.read(file)) };
		return this.on(file, () => box.value = parse(this.read(file))), box;
	}
	records(file, readOne) {
		let live = new LiveRecords(readOne);
		return live.reset(this.read(file)), this.on(file, (key, value) => live.update(key, value, this.read(file))), live.map;
	}
	changed(file, key, value) {
		for (let update of this.updaters.get(file) ?? []) update(key, value);
	}
	on(file, update) {
		let list = this.updaters.get(file);
		list ? list.push(update) : this.updaters.set(file, [update]);
	}
}, LiveRecords = class {
	readOne;
	map = new Map();
	constructor(readOne) {
		this.readOne = readOne;
	}
	reset(raw) {
		this.map.clear();
		for (let [key, value] of readRecords(raw, this.readOne)) this.map.set(key, value);
	}
	update(key, value, whole) {
		if (key === void 0) return this.reset(whole);
		let parsed = isObject(value) ? this.readOne(key, value) : null;
		parsed === null ? this.map.delete(key) : this.map.set(key, parsed);
	}
};
// ../../../packages/lib/src/shared/lang.ts
function formatText(template, args) {
	return template.replace(/\{(\d+)\}/g, (match, index) => {
		let value = args[Number(index)];
		return value === void 0 ? match : String(value);
	});
}
// ../../../packages/lib/src/shared/index.ts
function isRecord(value) {
	return typeof value == "object" && !!value && !Array.isArray(value);
}
function logSafe(text, max) {
	return text.replace(/\r?\n/g, " | ").replace(/[\u0000-\u001f\u007f]/g, "").replace(/\^\d/g, "").slice(0, max);
}
function previewJson(value, max) {
	let out = "", walk = (v, depth) => {
		if (out.length >= max) return;
		if (typeof v == "string") {
			out += JSON.stringify(v.length > max ? v.slice(0, max) : v);
			return;
		}
		if (typeof v != "object" || !v) {
			out += String(v);
			return;
		}
		if (depth > 4) {
			out += Array.isArray(v) ? "[...]" : "{...}";
			return;
		}
		if (Array.isArray(v)) {
			out += "[";
			for (let i = 0; i < v.length && out.length < max; i++) i > 0 && (out += ","), walk(v[i], depth + 1);
			out += "]";
			return;
		}
		out += "{";
		let first = !0;
		for (let key in v) {
			if (out.length >= max) break;
			first || (out += ","), first = !1, out += `${JSON.stringify(key.slice(0, 50))}:`, walk(v[key], depth + 1);
		}
		out += "}";
	};
	return walk(value, 0), out.slice(0, max);
}
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
	metaChangedEvent: "ai-core:metaChanged",
	definitionsChangedEvent: "ai-core:definitionsChanged",
	characterScreenEvent: "ai-core:characterScreen",
	inventoryChangedEvent: "ai-core:inventoryChanged",
	itemUsedEvent: "ai-core:itemUsed",
	playerDiedEvent: "ai-core:playerDied",
	clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
	clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
	clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
	characterLooksEvent: "ai-core:client:characterLooks",
	clientCacheEvent: "ai-core:client:cache",
	clientHudVisibleEvent: "ai-core:client:hudVisible",
	clientWorldSyncEvent: "ai-core:client:worldSync",
	clientDefinitionsEvent: "ai-core:client:definitions",
	vehicleTypeCallback: "ai-core:vehicleType",
	interactionStateKey: "ai:interaction",
	charactersCallback: "ai-core:characters",
	createCharacterCallback: "ai-core:createCharacter",
	deleteCharacterCallback: "ai-core:deleteCharacter",
	selectCharacterCallback: "ai-core:selectCharacter",
	spawnEvent: "ai-core:client:spawn",
	chooseSpawnEvent: "ai-core:client:chooseSpawn",
	spawnChoiceCallback: "ai-core:spawnChoice",
	openCharactersEvent: "ai-core:client:openCharacters"
}, PLAYER_BAGS = {
	dead: "dead",
	cuffed: "cuffed",
	proximity: "proximity"
}, ADMIN = {
	ace: "ai.admin",
	openCallback: "ai-core:admin:open",
	applyCallback: "ai-core:admin:apply",
	closeEvent: "ai-core:admin:close",
	showEvent: "ai-core:admin:show",
	deltaEvent: "ai-core:admin:delta",
	recommendationEvent: "ai-core:admin:recommendation",
	worldEvent: (resource) => `${resource}:admin:world`,
	worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
}, LIB_UI = {
	resource: "ai-lib",
	notifyEvent: "ai-lib:client:notify",
	promptPressedEvent: "ai-lib:client:promptPressed",
	cancelProgressEvent: "ai-lib:client:cancelProgress",
	progressForCallback: "ai-lib:progressFor",
	progressForCancelEvent: "ai-lib:client:progressForCancel",
	minigameForCallback: "ai-lib:minigameFor"
}, named = new Set();
function registerExport(name, handler) {
	named.add(name), globalThis.exports(name, handler);
	let first = name.charAt(0), twin = (first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase()) + name.slice(1);
	twin !== name && !named.has(twin) && globalThis.exports(twin, handler);
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
// ../../../packages/lib/src/server/position.ts
function entityCoords(entity) {
	let [x = 0, y = 0, z = 0] = GetEntityCoords(entity);
	return {
		x,
		y,
		z
	};
}
const coordsOf = (source) => entityCoords(GetPlayerPed(String(source)));
function isNear(source, point, metres) {
	let [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source))), dx = x - point.x, dy = y - point.y, dz = z - point.z;
	return dx * dx + dy * dy + dz * dz <= metres * metres;
}
resourceExport(CORE.resource);
const log$6 = createLogger(GetCurrentResourceName()), gates = new Set();
on("playerDropped", () => {
	let source = Number(globalThis.source);
	for (let gate of gates) gate.release(source);
});
var ClientGate = class {
	name;
	options;
	limit;
	lock;
	refusals = new Map();
	constructor(name, options, defaultRate) {
		this.name = name, this.options = options, this.limit = new RateLimit(options.rate?.count ?? defaultRate, options.rate?.windowMs ?? 1e3), this.lock = options.lock ? new SourceLock() : null, gates.add(this);
	}
	check(source, raw) {
		if (!(source > 0) || !GetPlayerName(String(source))) return null;
		if (!this.limit.take(source)) return this.refuse(source, "rate limit"), null;
		for (let guard of this.options.guards ?? []) {
			let verdict = guard(source);
			if (verdict !== !0) return typeof verdict == "string" && this.refuse(source, verdict), null;
		}
		if (!this.options.args) return [];
		let args = this.options.args(raw);
		return args === null && this.refuse(source, () => `invalid arguments ${logSafe(previewJson(raw, 200), 200)}`), args;
	}
	run(source, busy, task) {
		return this.lock ? this.lock.run(source, busy, async () => task()) : Promise.resolve(task());
	}
	release(source) {
		this.limit.release(source), this.lock?.release(source), this.refusals.delete(source);
	}
	refuse(source, reason) {
		let now = GetGameTimer(), last = this.refusals.get(source);
		if (last && now - last.at < 1e4) {
			last.skipped++;
			return;
		}
		let more = last?.skipped ? ` (+${last.skipped} more refused)` : "";
		this.refusals.set(source, {
			at: now,
			skipped: 0
		}), log$6.warn(`${this.name} refused for ${GetPlayerName(String(source))} (${source}): ${typeof reason == "string" ? reason : reason()}${more}`);
	}
};
// ../../../packages/lib/src/server/callback.ts
const log$5 = createLogger(GetCurrentResourceName()), resource$1 = GetCurrentResourceName(), REFUSED = Symbol("refused");
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
			log$5.error(`callback ${name} failed for ${source}`, error), emitNet(responseEvent(caller), source, id, !1, null);
		}
	});
}
const pending = new Map();
let nextId = 0;
onNet(responseEvent(resource$1), (id, ok, result) => {
	let entry = typeof id == "number" ? pending.get(id) : void 0;
	entry && entry.source === Number(globalThis.source) && (pending.delete(id), clearTimeout(entry.timer), ok === !0 ? entry.resolve(result) : entry.reject(Error("client callback failed")));
});
function triggerClientCallback(name, source, args = [], timeoutMs = 3e4) {
	let id = ++nextId;
	return new Promise((resolve, reject) => {
		let timer = setTimeout(() => {
			pending.delete(id), reject(Error(`client callback ${name} timed out for ${source}`));
		}, timeoutMs);
		pending.set(id, {
			source,
			resolve,
			reject,
			timer
		}), emitNet(requestEvent(name), source, resource$1, id, ...args);
	});
}
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
		case "run": return typeof value.id == "string" && value.id.length <= 64 ? {
			file: value.file,
			action: "run",
			key,
			id: value.id
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
const clone = (value) => value === void 0 ? value : JSON.parse(JSON.stringify(value)), core$15 = resourceExport(CORE.resource), ERR = {
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
			list = core$15.GetLookupValues(source);
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
// ../../../packages/lib/src/server/admin/edit.ts
const DEFAULT_KEY = "^[a-z0-9_]{2,32}$";
function imported(spec, value) {
	let base = clone(spec.newRecord ?? {}), out = {};
	for (let name of Object.keys(spec.sections)) {
		let v = name in value ? value[name] : base[name];
		v !== void 0 && (out[name] = clone(v));
	}
	return out;
}
function linked(spec, value, ctx) {
	return spec.type === "text" && spec.records && typeof value == "string" && value !== "" && !(value in ctx.get(spec.records)) ? "ADMIN_ERR_LOOKUP" : null;
}
function checkEdit(patch, spec, ctx) {
	let data = ctx.get(patch.file);
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
				let link = linked(section, record[name], ctx);
				if (link) return link;
			}
			let ruled = ctx.rule(patch.file)?.(key, record);
			if (ruled) return ruled;
		}
		return null;
	}
	let section = spec.sections[patch.section];
	if (!section || spec.kind === "records" && (!patch.key || !(patch.key in data))) return ERR.type;
	let refusal = validate(section, patch.value, patch.section);
	if (refusal) return refusal.error;
	let link = linked(section, patch.value, ctx);
	if (link) return link;
	let current = spec.kind === "records" ? data[patch.key ?? ""] : data, next = {
		...isRecord(current) ? current : {},
		[patch.section]: patch.value
	};
	return ctx.rule(patch.file)?.(patch.key, next) ?? null;
}
function applyEdit(data, patch, spec) {
	if (patch.action === "import") {
		for (let [key, value] of Object.entries(patch.records)) data[key] = imported(spec, value);
		return Object.keys(patch.records);
	}
	if (patch.action === "create") {
		let record = clone(spec.newRecord ?? {});
		spec.labelPath && (record[spec.labelPath] = patch.label), data[patch.key] = record;
	} else if (patch.action === "delete") delete data[patch.key];
	else {
		let target = spec.kind === "records" ? data[patch.key ?? ""] : data;
		if (!isRecord(target)) return [];
		patch.value === void 0 || patch.value === null ? delete target[patch.section] : target[patch.section] = clone(patch.value);
	}
	return [spec.kind === "records" ? patch.key : void 0];
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
		if (field.widget === "action") continue;
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
const core$14 = resourceExport(CORE.resource);
var AdminPanel = class {
	schema;
	data = new Map();
	dataFiles = new Map();
	handlers = new Map();
	rules = new Map();
	actions = new Map();
	views = new FileViews((file) => this.get(file));
	worldChanges = new Map();
	resource = GetCurrentResourceName();
	log = createLogger(this.resource);
	editor = 0;
	constructor(schema) {
		this.schema = schema;
		for (let [name, spec] of Object.entries(schema.files)) this.load(name, spec);
		registerExport("AdminPanelSnapshot", () => this.snapshot()), registerExport("AdminPanelApply", (admin, patch) => this.apply(admin, patch)), onClientCallback(ADMIN.worldChangesCallback(this.resource), () => Object.fromEntries(this.worldChanges), { rate: {
			count: 4,
			windowMs: 1e4
		} }), setImmediate(() => core$14.RegisterAdminPanel(this.resource));
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
	onAction(id, handler) {
		this.actions.set(id, handler);
	}
	view(file, read) {
		return this.views.view(file, read);
	}
	records(file, readOne) {
		return this.views.records(file, readOne);
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
		if (!patch || !spec) return {
			ok: !1,
			error: ERR.type
		};
		this.editor = admin;
		try {
			if (patch.action === "run") return this.run(admin, patch, spec);
			if (spec.memory) return {
				ok: !1,
				error: ERR.type
			};
			let error = checkEdit(patch, spec, {
				get: (file) => this.get(file),
				rule: (file) => this.rules.get(file)
			});
			return error ? (this.log.warn(`admin ${admin} edit refused (${error}): ${previewJson(patch, 300)}`), {
				ok: !1,
				error
			}) : (this.store(patch, spec), { ok: !0 });
		} finally {
			this.editor = 0;
		}
	}
	run(admin, patch, spec) {
		let handler = this.actions.get(patch.id), data = this.get(patch.file), target = spec.kind === "records" ? data[patch.key ?? ""] : data;
		if (!handler || !isRecord(target)) return {
			ok: !1,
			error: ERR.type
		};
		try {
			let error = handler(admin, clone(target), patch.key);
			return error ? {
				ok: !1,
				error
			} : { ok: !0 };
		} catch (error) {
			return this.log.error(`panel action ${patch.id} failed`, error), {
				ok: !1,
				error: ERR.type
			};
		}
	}
	commit(file, key, value) {
		let data = this.data.get(file);
		data && (key === void 0 ? isRecord(value) && this.data.set(file, clone(value)) : value === null ? delete data[key] : data[key] = clone(value), this.changed(file, key));
	}
	commitAfter(file, key, value) {
		setImmediate(() => this.commit(file, key, value));
	}
	store(patch, spec) {
		let data = this.data.get(patch.file) ?? {}, keys = applyEdit(data, patch, spec);
		if (keys.length !== 0) {
			this.data.set(patch.file, data);
			for (let key of keys) this.changed(patch.file, key);
		}
	}
	changed(file, key) {
		let spec = this.schema.files[file], data = this.get(file), value = key === void 0 ? data : data[key] ?? null;
		this.dataFiles.get(file)?.write(data), this.views.changed(file, key, value);
		for (let handler of this.handlers.get(file) ?? []) handler(key, value);
		if (core$14.AdminPanelChanged({
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
// ../../../packages/lib/src/server/notify.ts
function notify(source, text, kind = "info", duration) {
	let notification = {
		text,
		kind,
		duration
	};
	emitNet(LIB_UI.notifyEvent, source, notification);
}
// ../../../packages/lib/src/server/inventory.ts
const core$13 = resourceExport(CORE.resource), inventory = {
	addItem: (inv, item, count = 1, metadata, slot) => core$13.AddItem(inv, item, count, metadata, slot),
	removeItem: (inv, item, count = 1, metadata, slot) => core$13.RemoveItem(inv, item, count, metadata, slot),
	getItemCount: (inv, item, metadata) => core$13.GetItemCount(inv, item, metadata),
	hasItem: (inv, item, count = 1) => core$13.HasItem(inv, item, count),
	canCarryItem: (inv, item, count = 1, metadata) => core$13.CanCarryItem(inv, item, count, metadata),
	getItems: (inv) => core$13.GetItems(inv),
	clearInventory: (inv) => core$13.ClearInventory(inv),
	registerStash: (name, label, slots, maxWeight, jobs = []) => core$13.RegisterStash(name, label, slots, maxWeight, jobs),
	openInventory: (source, inv) => core$13.OpenInventory(source, inv),
	registerUsableItem: (name, handler) => core$13.RegisterUsableItem(name, handler),
	getItemDefinition: (name) => core$13.GetItemDefinition(name)
}, core$12 = resourceExport(CORE.resource);
function reindex(index, source, before, after) {
	for (let name of before) {
		let set = index.get(name);
		set && (set.delete(source), set.size === 0 && index.delete(name));
	}
	for (let name of after) {
		let set = index.get(name);
		set || index.set(name, set = new Set()), set.add(source);
	}
}
var OnlinePlayers = class {
	players = new Map();
	onDuty = new Map();
	jobIndex = new Map();
	gangIndex = new Map();
	started = !1;
	start() {
		if (this.started) return;
		this.started = !0;
		let load = (source, character) => {
			this.drop(source), this.players.set(source, {
				character,
				jobs: [],
				jobNames: [],
				gangs: [],
				gangNames: [],
				duty: null
			}), this.setJobs(source, core$12.GetJobs(source) ?? []), this.setGangs(source, core$12.GetGangs(source) ?? []), this.setDuty(source, core$12.GetDutyJob(source));
		};
		on(CORE.playerLoadedEvent, load), on(CORE.playerUnloadedEvent, (source) => this.drop(source)), on(CORE.jobsChangedEvent, (source, jobs) => this.setJobs(source, jobs)), on(CORE.gangsChangedEvent, (source, gangs) => this.setGangs(source, gangs)), on(CORE.dutyChangedEvent, (source, job) => this.setDuty(source, job));
		for (let source of core$12.GetLoadedSources()) {
			let character = core$12.GetCharacter(source);
			character && load(source, character);
		}
	}
	drop(source) {
		let player = this.players.get(source);
		player && (this.setDuty(source, null), reindex(this.jobIndex, source, player.jobNames, []), reindex(this.gangIndex, source, player.gangNames, []), this.players.delete(source));
	}
	setJobs(source, jobs) {
		let player = this.players.get(source);
		if (!player) return;
		let names = jobs.map((m) => m.job);
		reindex(this.jobIndex, source, player.jobNames, names), player.jobs = jobs, player.jobNames = names;
	}
	setGangs(source, gangs) {
		let player = this.players.get(source);
		if (!player) return;
		let names = gangs.map((m) => m.gang);
		reindex(this.gangIndex, source, player.gangNames, names), player.gangs = gangs, player.gangNames = names;
	}
	setDuty(source, job) {
		let player = this.players.get(source);
		if (!player) return;
		if (player.duty) {
			let set = this.onDuty.get(player.duty);
			set?.delete(source), set?.size === 0 && this.onDuty.delete(player.duty);
		}
		if (player.duty = job, !job) return;
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
	name(source, options = {}) {
		let c = this.character(source);
		return c ? `${c.firstname} ${c.lastname}` : options.fallback === !1 ? "" : GetPlayerName(String(source));
	}
	jobs(source) {
		return this.start(), this.players.get(source)?.jobNames ?? [];
	}
	gangs(source) {
		return this.start(), this.players.get(source)?.gangNames ?? [];
	}
	jobGrade(source, job) {
		return this.start(), this.players.get(source)?.jobs.find((m) => m.job === job)?.grade ?? null;
	}
	gangGrade(source, gang) {
		return this.start(), this.players.get(source)?.gangs.find((m) => m.gang === gang)?.grade ?? null;
	}
	jobMembers(job) {
		return this.start(), this.jobIndex.get(job) ?? EMPTY;
	}
	gangMembers(gang) {
		return this.start(), this.gangIndex.get(gang) ?? EMPTY;
	}
	dutyJob(source) {
		return this.start(), this.players.get(source)?.duty ?? null;
	}
	onDutyIn(source, jobs) {
		let duty = this.dutyJob(source);
		return duty !== null && jobs.includes(duty);
	}
	countOnDuty(jobs) {
		this.start();
		let count = 0;
		for (let job of jobs) count += this.onDuty.get(job)?.size ?? 0;
		return count;
	}
	onDutyFor(job) {
		return this.start(), this.onDuty.get(job) ?? EMPTY;
	}
};
const EMPTY = new Set(), online = new OnlinePlayers(), core$11 = resourceExport(CORE.resource), vehicleKeys = {
	give: (source, vehicle, purpose = "temporary") => core$11.GiveVehicleKeys(source, vehicle, purpose),
	remove: (source, vehicle) => core$11.RemoveVehicleKeys(source, vehicle),
	has: (source, vehicle) => core$11.HasVehicleKeys(source, vehicle)
};
function randomPlate(prefix) {
	let digit = () => String(Math.floor(Math.random() * 10));
	if (prefix !== void 0) {
		let plate = prefix.slice(0, 8);
		for (; plate.length < 8;) plate += digit();
		return plate;
	}
	let letter = () => "ABCDEFGHJKLMNPRSTUVWXYZ"[Math.floor(Math.random() * 23)] ?? "A";
	return `${digit()}${digit()}${letter()}${letter()}${letter()}${digit()}${digit()}${digit()}`;
}
function nearestVehicleTo(source, metres, filter) {
	let ped = GetPlayerPed(String(source)), own = GetVehiclePedIsIn(ped, !1);
	if (own && (!filter || filter(own))) return own;
	let [x = 0, y = 0, z = 0] = GetEntityCoords(ped), best = 0, bestDistance = metres;
	for (let vehicle of GetAllVehicles()) {
		let [vx = 0, vy = 0, vz = 0] = GetEntityCoords(vehicle), d = Math.hypot(vx - x, vy - y, vz - z);
		d < bestDistance && (!filter || filter(vehicle)) && ([best, bestDistance] = [vehicle, d]);
	}
	return best;
}
function entityFromNet(netId, type) {
	if (readId(netId) === null) return 0;
	let entity = NetworkGetEntityFromNetworkId(netId);
	return !entity || !DoesEntityExist(entity) ? 0 : type === void 0 || GetEntityType(entity) === type ? entity : 0;
}
const vehicleFromNet = (netId) => entityFromNet(netId, 2), core$10 = resourceExport(CORE.resource);
function within(point, radius, candidates) {
	let out = [];
	for (let source of candidates) {
		let p = coordsOf(source);
		Math.hypot(p.x - point.x, p.y - point.y, p.z - point.z) <= radius && out.push(source);
	}
	return out;
}
function playersNear(source, radius) {
	return within(coordsOf(source), radius, [source, ...core$10.GetPlayersInScope(source)]);
}
function nearestPlayerTo(source, metres, filter) {
	let from = coordsOf(source), best = null, bestDistance = metres;
	for (let other of core$10.GetPlayersInScope(source)) {
		if (other === source) continue;
		let p = coordsOf(other), d = Math.hypot(p.x - from.x, p.y - from.y, p.z - from.z);
		d > bestDistance || filter && !filter(other) || (best = other, bestDistance = d);
	}
	return best;
}
// ../../../packages/lib/src/server/players.ts
const log$4 = createLogger(GetCurrentResourceName()), dropped = new Set();
let listening = !1;
function onDropped(fn) {
	listening || (listening = !0, on("playerDropped", () => {
		let source = Number(globalThis.source);
		for (let handler of dropped) handler(source);
	})), dropped.add(fn);
}
var PlayerMap = class extends Map {
	constructor(options = {}) {
		super(), onDropped((source) => {
			if (!this.has(source)) return;
			let value = this.get(source);
			this.delete(source), options.onDrop?.(source, value);
		});
	}
}, Cooldowns = class {
	until = new PlayerMap();
	ready(source) {
		return this.left(source) === 0;
	}
	start(source, ms) {
		this.until.set(source, GetGameTimer() + ms);
	}
	take(source, ms) {
		return this.ready(source) ? (this.start(source, ms), !0) : !1;
	}
	left(source) {
		let until = this.until.get(source);
		if (until === void 0) return 0;
		let left = until - GetGameTimer();
		return left > 0 ? left : (this.until.delete(source), 0);
	}
	clear(source) {
		this.until.delete(source);
	}
};
function onCharacter(handlers) {
	let live = new Map(), deliver = (source, character) => {
		if (live.set(source, character.id), handlers.loaded) try {
			let result = handlers.loaded(source, character);
			result instanceof Promise && result.catch((error) => log$4.error(`character loaded handler failed for ${source}`, error));
		} catch (error) {
			log$4.error(`character loaded handler failed for ${source}`, error);
		}
	}, end = (source, charId) => {
		if (live.delete(source)) try {
			handlers.unloaded?.(source, charId);
		} catch (error) {
			log$4.error(`character unloaded handler failed for ${source}`, error);
		}
	};
	on(CORE.playerLoadedEvent, (source, character) => {
		let previous = live.get(source);
		previous !== void 0 && end(source, previous), deliver(source, character);
	}), on(CORE.playerUnloadedEvent, (source, charId) => end(source, charId)), onDropped((source) => setImmediate(() => {
		let charId = live.get(source);
		charId !== void 0 && end(source, charId);
	})), setImmediate(() => {
		for (let source of online.sources()) {
			if (live.has(source)) continue;
			let character = online.character(source);
			character && deliver(source, character);
		}
	});
}
// ../../../packages/lib/src/server/pending.ts
var PendingActions = class {
	actions = new PlayerMap();
	minRatio;
	next = 0;
	constructor(options = {}) {
		this.minRatio = options.minRatio ?? .8, on(CORE.playerUnloadedEvent, (source) => this.actions.delete(source));
	}
	start(source, data, durationMs) {
		return this.next = this.next >= 2147483647 ? 1 : this.next + 1, this.actions.set(source, {
			token: this.next,
			data,
			startedAt: GetGameTimer(),
			durationMs
		}), this.next;
	}
	take(source, token) {
		let action = this.actions.get(source);
		return !action || action.token !== token ? null : (this.actions.delete(source), GetGameTimer() - action.startedAt >= action.durationMs * this.minRatio ? action.data : null);
	}
	peek(source) {
		return this.actions.get(source)?.data ?? null;
	}
	cancel(source) {
		this.actions.delete(source);
	}
	get size() {
		return this.actions.size;
	}
};
// ../../../packages/lib/src/server/progressFor.ts
const running = new PlayerMap({ onDrop: (_source, settle) => settle(!1) });
on(CORE.playerUnloadedEvent, (source) => {
	let settle = running.get(source);
	settle && settle(!1);
});
function progressFor(source, options) {
	let previous = running.get(source);
	previous && (previous(!1), emitNet(LIB_UI.progressForCancelEvent, source));
	let { minRatio = .8, ...bar } = options, startedAt = GetGameTimer();
	return new Promise((resolve) => {
		let done = !1, settle = (ok) => {
			done || (done = !0, running.get(source) === settle && running.delete(source), resolve(ok));
		};
		running.set(source, settle), triggerClientCallback(LIB_UI.progressForCallback, source, [bar], bar.duration + 15e3).then((answer) => settle(answer === !0 && GetGameTimer() - startedAt >= bar.duration * minRatio), () => settle(!1));
	});
}
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
const log$2 = createLogger(GetCurrentResourceName());
function onClientEvent(name, first, second) {
	let [handler, options] = typeof first == "function" ? [first, second ?? {}] : [second, first], gate = new ClientGate(name, options, 10);
	onNet(name, (...raw) => {
		let source = Number(globalThis.source), args = gate.check(source, raw);
		args && gate.run(source, void 0, () => handler(source, ...args)).catch((error) => log$2.error(`event ${name} failed for ${source}`, error));
	});
}
createLogger("aicore-lib");
let log = null;
var ScheduledJob = class {
	interval;
	fn;
	name;
	gen = 0;
	active = !1;
	stopped = !1;
	quietUntil = 0;
	skipped = 0;
	constructor(interval, fn, name) {
		this.interval = interval, this.fn = fn, this.name = name;
	}
	get running() {
		return this.active;
	}
	set(active) {
		active === this.active || active && this.stopped || (this.active = active, active ? scheduler.activate(this) : scheduler.deactivate(this));
	}
	stop() {
		this.set(!1), this.stopped = !0;
	}
	call() {
		try {
			let result = this.fn();
			result instanceof Promise && result.catch((error) => this.fail(error));
		} catch (error) {
			this.fail(error);
		}
	}
	fail(error) {
		let now = GetGameTimer();
		if (now < this.quietUntil) {
			this.skipped++;
			return;
		}
		this.quietUntil = now + 1e4;
		let more = this.skipped ? ` (+${this.skipped} more)` : "";
		this.skipped = 0, log ??= createLogger(GetCurrentResourceName()), log.error(`job "${this.name}" failed${more}`, error instanceof Error ? error.stack ?? error.message : error);
	}
}, Group = class {
	interval;
	jobs = Array(8);
	gens = Array(8).fill(0);
	dues = Array(8).fill(0);
	head = 0;
	mask = 7;
	count = 0;
	constructor(interval) {
		this.interval = interval;
	}
	get front() {
		return this.dues[this.head] ?? 0;
	}
	compactAt = 64;
	push(job, due) {
		this.count >= this.compactAt && this.compact(), this.count > this.mask && this.grow();
		let i = this.head + this.count & this.mask;
		this.jobs[i] = job, this.gens[i] = job.gen, this.dues[i] = due, this.count++;
	}
	run(now) {
		for (let left = this.count; left > 0 && this.count > 0; left--) {
			let i = this.head, due = this.dues[i] ?? 0;
			if (due > now) return;
			let job = this.jobs[i], gen = this.gens[i];
			if (this.jobs[i] = void 0, this.head = i + 1 & this.mask, this.count--, !job || job.gen !== gen) continue;
			let next = due + this.interval;
			next <= now && (next = now + this.interval), this.push(job, next), job.call();
		}
	}
	compact() {
		let kept = 0;
		for (let n = 0; n < this.count; n++) {
			let i = this.head + n & this.mask, job = this.jobs[i];
			if (!job || job.gen !== this.gens[i]) continue;
			let k = this.head + kept & this.mask;
			this.jobs[k] = job, this.gens[k] = this.gens[i] ?? 0, this.dues[k] = this.dues[i] ?? 0, kept++;
		}
		for (let n = kept; n < this.count; n++) this.jobs[this.head + n & this.mask] = void 0;
		this.count = kept, this.compactAt = Math.max(64, kept * 2);
	}
	grow() {
		let size = (this.mask + 1) * 2, jobs = Array(size), gens = Array(size).fill(0), dues = Array(size).fill(0);
		for (let n = 0; n < this.count; n++) {
			let i = this.head + n & this.mask;
			jobs[n] = this.jobs[i], gens[n] = this.gens[i] ?? 0, dues[n] = this.dues[i] ?? 0;
		}
		this.jobs = jobs, this.gens = gens, this.dues = dues, this.head = 0, this.mask = size - 1;
	}
};
const scheduler = new class {
	groups = [];
	byInterval = new Map();
	tick = null;
	active = 0;
	nextDue = Infinity;
	running = !1;
	activate(job) {
		job.gen++, this.active++;
		let due = GetGameTimer() + job.interval, group = this.byInterval.get(job.interval);
		group || (group = new Group(job.interval), this.byInterval.set(job.interval, group), this.groups.push(group)), group.push(job, due), due < this.nextDue && (this.nextDue = due), this.tick ??= setTick(this.onTick);
	}
	deactivate(job) {
		job.gen++, this.active--, this.active === 0 && !this.running && this.halt();
	}
	halt() {
		this.tick !== null && clearTick(this.tick), this.tick = null, this.groups.length = 0, this.byInterval.clear(), this.nextDue = Infinity;
	}
	onTick = () => {
		let now = GetGameTimer();
		if (now < this.nextDue) return;
		let groups = this.groups;
		this.running = !0;
		for (let i = 0; i < groups.length; i++) {
			let group = groups[i];
			group && group.count > 0 && group.front <= now && group.run(now);
		}
		if (this.running = !1, this.active === 0) return this.halt();
		let soonest = Infinity, kept = 0;
		for (let i = 0; i < groups.length; i++) {
			let group = groups[i];
			group && (group.count === 0 ? this.byInterval.delete(group.interval) : (groups[kept++] = group, group.front < soonest && (soonest = group.front)));
		}
		groups.length = kept, this.nextDue = soonest;
	};
}();
function every(ms, fn, options = {}) {
	let job = new ScheduledJob(Math.max(0, Math.floor(ms)), fn, options.name ?? (fn.name || "anonymous"));
	return options.active !== !1 && job.set(!0), job;
}
// ../../../packages/lib/src/fivem/state.ts
const stateNumber = (v) => typeof v == "number" && Number.isFinite(v) ? v : void 0, stateBoolean = (v) => typeof v == "boolean" ? v : void 0, stateString = (v) => typeof v == "string" ? v : void 0, isServer = IsDuplicityVersion();
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
}, EntityState$1 = class extends Mirror {
	handles = new Map();
	constructor(key, parse) {
		super(key, parse), AddStateBagChangeHandler(key, "", (bag, _key, value) => {
			if (!bag.startsWith("entity:")) return;
			let netId = Number(bag.slice(7));
			this.handles.set(netId, GetEntityFromStateBagName(bag)), this.store(netId, value);
		}), isServer ? on("entityRemoved", (entity) => this.forget(NetworkGetNetworkIdFromEntity(entity))) : every(3e4, () => this.prune(), { name: `state ${key}` });
	}
	get(entity) {
		if (!entity) return;
		let netId = NetworkGetNetworkIdFromEntity(entity), handle = this.handles.get(netId);
		if (handle === entity) return this.values.get(netId);
		if (handle === 0 && this.values.has(netId)) return this.handles.set(netId, entity), this.values.get(netId);
		this.handles.set(netId, entity);
		let value = this.parseRaw(Entity(entity).state[this.key]);
		return this.values.set(netId, value), value;
	}
	put(entity, value) {
		let netId = NetworkGetNetworkIdFromEntity(entity);
		this.handles.set(netId, entity), this.apply(netId, value);
	}
	getByNetId(netId) {
		return this.values.get(netId);
	}
	forget(netId) {
		this.values.delete(netId), this.handles.delete(netId);
	}
	parseRaw(raw) {
		return raw == null ? void 0 : this.parse(raw);
	}
	prune() {
		for (let netId of this.values.keys()) DoesEntityExist(NetworkGetEntityFromNetworkId(netId)) || this.forget(netId);
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
}, EntityState = class extends EntityState$1 {
	set(entity, value) {
		DoesEntityExist(entity) && (Entity(entity).state.set(this.key, value ?? null, !0), this.put(entity, value));
	}
}, PlayerState = class extends PlayerState$1 {
	set(source, value) {
		Player(source).state.set(this.key, value ?? null, !0), this.put(source, value);
	}
};
resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource), resourceExport(CORE.resource);
// ../../../packages/lib/src/server/index.ts
function isOnline(source) {
	return !!GetPlayerName(String(source));
}
// resource/common/places.ts
const ZERO = {
	x: 0,
	y: 0,
	z: 0,
	heading: 0
};
function readTeleport(id, v) {
	return {
		id,
		label: str(v.label, id, 48),
		from: vec4(v.from, ZERO),
		to: vec4(v.to, ZERO),
		job: str(v.job, "", 32)
	};
}
function readElevator(id, v) {
	let floors = (Array.isArray(v.floors) ? v.floors : []).map((row, i) => {
		let f = record(row);
		return {
			label: str(f.label, String(i + 1), 32),
			point: vec4(f.point, ZERO),
			job: str(f.job, "", 32)
		};
	});
	return floors.length >= 2 ? {
		id,
		label: str(v.label, id, 48),
		floors
	} : null;
}
function readMooring(id, v) {
	let { x, y, z } = vec4(v.point, ZERO);
	return {
		id,
		point: {
			x,
			y,
			z
		}
	};
}
// resource/common/small.ts
const EVENTS = {
	tackle: "ai-smallresources:tackle",
	tackled: "ai-smallresources:client:tackled",
	teleport: "ai-smallresources:teleport",
	elevator: "ai-smallresources:elevator",
	binoculars: "ai-smallresources:client:binoculars",
	firework: "ai-smallresources:client:firework",
	carry: "ai-smallresources:carry",
	carryAsk: "ai-smallresources:client:carryAsk",
	noteWrite: "ai-smallresources:client:noteWrite",
	noteSave: "ai-smallresources:noteSave",
	noteRead: "ai-smallresources:client:noteRead",
	moor: "ai-smallresources:moor"
}, CARRY_STATE = {
	carrying: "aiCarrying",
	carriedBy: "aiCarriedBy"
}, VEHICLE_STATE = {
	realPlate: "aiRealPlate",
	moored: "aiMoored"
}, ITEMS = {
	fakePlate: "fakeplate",
	notepad: "notepad",
	note: "note"
};
function readSettings(raw) {
	let v = record(raw), percent = (value, fallback) => int(value, fallback, 0, 100);
	return {
		seatbelt: bool(v.seatbelt, !0),
		ejectUnbelted: int(v.ejectUnbelted, 20, 0, 500),
		ejectBelted: int(v.ejectBelted, 160, 0, 500),
		cruise: bool(v.cruise, !0),
		crouch: bool(v.crouch, !0),
		noShuffle: bool(v.noShuffle, !0),
		noRadio: bool(v.noRadio, !1),
		fakePlate: bool(v.fakePlate, !0),
		boatRope: bool(v.boatRope, !0),
		noDispatch: bool(v.noDispatch, !0),
		hideHud: bool(v.hideHud, !0),
		pedDensity: percent(v.pedDensity, 80),
		scenarioDensity: percent(v.scenarioDensity, 80),
		trafficDensity: percent(v.trafficDensity, 80),
		parkedDensity: percent(v.parkedDensity, 80),
		tackle: bool(v.tackle, !0),
		point: bool(v.point, !0),
		handsUp: bool(v.handsUp, !0),
		ragdoll: bool(v.ragdoll, !0),
		carry: bool(v.carry, !0),
		sit: bool(v.sit, !0),
		antiPeek: bool(v.antiPeek, !0),
		afkMinutes: int(v.afkMinutes, 20, 0, 600),
		binoculars: bool(v.binoculars, !0),
		fireworks: bool(v.fireworks, !0),
		notepad: bool(v.notepad, !0)
	};
}
// resource/common/seats.ts
const SEAT_TYPES = {
	chair: {
		kind: "scenario",
		name: "PROP_HUMAN_SEAT_CHAIR_MP_PLAYER"
	},
	armchair: {
		kind: "scenario",
		name: "PROP_HUMAN_SEAT_ARMCHAIR"
	},
	bench: {
		kind: "scenario",
		name: "PROP_HUMAN_SEAT_BENCH"
	},
	bar: {
		kind: "scenario",
		name: "PROP_HUMAN_SEAT_BAR"
	},
	deck: {
		kind: "scenario",
		name: "PROP_HUMAN_SEAT_DECKCHAIR"
	},
	sunlounger: {
		kind: "scenario",
		name: "PROP_HUMAN_SEAT_SUNLOUNGER"
	},
	strip: {
		kind: "scenario",
		name: "PROP_HUMAN_SEAT_STRIP_WATCH"
	},
	wall: {
		kind: "scenario",
		name: "WORLD_HUMAN_SEAT_WALL"
	},
	steps: {
		kind: "scenario",
		name: "WORLD_HUMAN_SEAT_STEPS"
	},
	ledge: {
		kind: "scenario",
		name: "WORLD_HUMAN_SEAT_LEDGE"
	},
	tattoo: {
		kind: "anim",
		dict: "misstattoo_parlour@shop_ig_4",
		clip: "customer_loop",
		z: -.75
	},
	lounge: {
		kind: "anim",
		dict: "timetable@jimmy@mics3_ig_15@",
		clip: "idle_a_jimmy",
		z: 0
	},
	director: {
		kind: "anim",
		dict: "misscarsteal4@director_grip",
		clip: "beginning_loop_director",
		z: -1.16
	}
}, PLACE_TABS = [
	{
		id: "elevators",
		file: "elevators",
		icon: "elevator",
		label: "ADMIN_TAB_ELEVATORS",
		desc: "ADMIN_TAB_ELEVATORS_DESC",
		createLabel: "ADMIN_NEW_ELEVATOR",
		deleteLabel: "ADMIN_DELETE_ELEVATOR",
		cards: [{
			icon: "elevator",
			title: "ADMIN_C_ELEVATOR",
			desc: "ADMIN_C_ELEVATOR_DESC",
			fields: [{
				widget: "text",
				path: "label",
				label: "ADMIN_F_LABEL",
				placeholder: "ADMIN_P_ELEVATOR"
			}, {
				widget: "list",
				path: "floors",
				label: "ADMIN_F_FLOORS",
				hint: "ADMIN_H_FLOORS",
				addLabel: "ADMIN_ADD_FLOOR",
				max: 20,
				newRow: {
					label: "",
					point: {
						x: 0,
						y: 0,
						z: 0,
						heading: 0
					},
					job: ""
				},
				rows: [
					{
						widget: "text",
						path: "label",
						label: "ADMIN_F_FLOOR_LABEL",
						placeholder: "ADMIN_P_FLOOR"
					},
					{
						widget: "point",
						path: "point",
						label: "ADMIN_F_FLOOR_POINT",
						heading: !0,
						ground: !0
					},
					{
						widget: "text",
						lookup: "job",
						path: "job",
						label: "ADMIN_F_JOB",
						hint: "ADMIN_H_FLOOR_JOB",
						placeholder: "ADMIN_P_JOB"
					}
				]
			}]
		}]
	},
	{
		id: "moorings",
		file: "moorings",
		icon: "anchor",
		label: "ADMIN_TAB_MOORINGS",
		desc: "ADMIN_TAB_MOORINGS_DESC",
		createLabel: "ADMIN_NEW_MOORING",
		deleteLabel: "ADMIN_DELETE_MOORING",
		cards: [{
			icon: "anchor",
			title: "ADMIN_C_MOORING",
			desc: "ADMIN_C_MOORING_DESC",
			fields: [{
				widget: "text",
				path: "label",
				suggest: { from: "point" },
				label: "ADMIN_F_LABEL",
				placeholder: "ADMIN_P_MOORING"
			}, {
				widget: "point",
				path: "point",
				label: "ADMIN_F_MOORING_POINT",
				hint: "ADMIN_H_MOORING_POINT"
			}]
		}]
	},
	{
		id: "seats",
		file: "seats",
		icon: "chair",
		label: "ADMIN_TAB_SEATS",
		desc: "ADMIN_TAB_SEATS_DESC",
		listSub: "type",
		createLabel: "ADMIN_NEW_SEAT",
		deleteLabel: "ADMIN_DELETE_SEAT",
		cards: [{
			icon: "chair",
			title: "ADMIN_C_SEAT",
			desc: "ADMIN_C_SEAT_DESC",
			fields: [
				{
					widget: "model",
					kind: "object",
					path: "model",
					label: "ADMIN_F_SEAT_MODEL",
					hint: "ADMIN_H_SEAT_MODEL",
					placeholder: "ADMIN_P_SEAT_MODEL"
				},
				{
					widget: "select",
					path: "type",
					label: "ADMIN_F_SEAT_TYPE",
					hint: "ADMIN_H_SEAT_TYPE",
					options: Object.keys(SEAT_TYPES).map((value) => ({
						value,
						label: `ADMIN_SEAT_${value.toUpperCase()}`
					}))
				},
				{
					widget: "switch",
					path: "teleport",
					label: "ADMIN_F_SEAT_TELEPORT",
					hint: "ADMIN_H_SEAT_TELEPORT"
				},
				{
					widget: "list",
					path: "seats",
					label: "ADMIN_F_SEATS",
					hint: "ADMIN_H_SEATS",
					addLabel: "ADMIN_ADD_SEAT",
					max: 12,
					newRow: {
						x: 0,
						y: 0,
						z: .5,
						heading: 180
					},
					rows: [
						{
							widget: "number",
							path: "x",
							label: "ADMIN_F_SEAT_X",
							min: -10,
							max: 10,
							step: .05,
							unit: "m"
						},
						{
							widget: "number",
							path: "y",
							label: "ADMIN_F_SEAT_Y",
							min: -10,
							max: 10,
							step: .05,
							unit: "m"
						},
						{
							widget: "number",
							path: "z",
							label: "ADMIN_F_SEAT_Z",
							min: -10,
							max: 10,
							step: .05,
							unit: "m"
						},
						{
							widget: "number",
							path: "heading",
							label: "ADMIN_F_SEAT_HEADING",
							min: 0,
							max: 360,
							step: 5,
							unit: "°"
						}
					]
				}
			]
		}]
	}
], switchField = (path, key) => ({
	widget: "switch",
	path,
	label: `ADMIN_F_${key}`,
	hint: `ADMIN_H_${key}`
}), percentField = (path, key) => ({
	widget: "number",
	path,
	label: `ADMIN_F_${key}`,
	hint: `ADMIN_H_${key}`,
	min: 0,
	max: 100,
	step: 5,
	unit: "%"
}), BOOL = { type: "bool" }, PERCENT = {
	type: "number",
	min: 0,
	max: 100,
	integer: !0
}, SETTINGS_SECTIONS = {
	seatbelt: BOOL,
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
	cruise: BOOL,
	noShuffle: BOOL,
	noRadio: BOOL,
	fakePlate: BOOL,
	boatRope: BOOL,
	crouch: BOOL,
	tackle: BOOL,
	point: BOOL,
	handsUp: BOOL,
	ragdoll: BOOL,
	carry: BOOL,
	sit: BOOL,
	antiPeek: BOOL,
	binoculars: BOOL,
	fireworks: BOOL,
	notepad: BOOL,
	afkMinutes: {
		type: "number",
		min: 0,
		max: 600,
		integer: !0
	},
	noDispatch: BOOL,
	hideHud: BOOL,
	pedDensity: PERCENT,
	scenarioDensity: PERCENT,
	trafficDensity: PERCENT,
	parkedDensity: PERCENT
}, SETTINGS_DEFAULTS = {
	noRadio: !1,
	fakePlate: !0,
	boatRope: !0,
	point: !0,
	handsUp: !0,
	ragdoll: !0,
	carry: !0,
	sit: !0,
	antiPeek: !0,
	notepad: !0,
	pedDensity: 80,
	scenarioDensity: 80,
	trafficDensity: 80,
	parkedDensity: 80
}, SETTINGS_CARDS = [
	{
		icon: "car",
		title: "ADMIN_C_DRIVING",
		desc: "ADMIN_C_DRIVING_DESC",
		fields: [
			switchField("seatbelt", "SEATBELT"),
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
			switchField("cruise", "CRUISE"),
			switchField("noShuffle", "NO_SHUFFLE"),
			switchField("noRadio", "NO_RADIO"),
			switchField("fakePlate", "FAKE_PLATE"),
			switchField("boatRope", "BOAT_ROPE")
		]
	},
	{
		icon: "user",
		title: "ADMIN_C_PLAYER",
		desc: "ADMIN_C_PLAYER_DESC",
		fields: [
			switchField("crouch", "CROUCH"),
			switchField("point", "POINT"),
			switchField("handsUp", "HANDS_UP"),
			switchField("ragdoll", "RAGDOLL"),
			switchField("sit", "SIT"),
			switchField("carry", "CARRY"),
			switchField("tackle", "TACKLE"),
			switchField("antiPeek", "ANTI_PEEK"),
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
		icon: "box",
		title: "ADMIN_C_ITEMS",
		desc: "ADMIN_C_ITEMS_DESC",
		fields: [
			switchField("binoculars", "BINOCULARS"),
			switchField("fireworks", "FIREWORKS"),
			switchField("notepad", "NOTEPAD")
		]
	},
	{
		icon: "map-location-dot",
		title: "ADMIN_C_WORLD",
		desc: "ADMIN_C_WORLD_DESC",
		fields: [switchField("noDispatch", "NO_DISPATCH"), switchField("hideHud", "HIDE_HUD")]
	},
	{
		icon: "people-group",
		title: "ADMIN_C_DENSITY",
		desc: "ADMIN_C_DENSITY_DESC",
		fields: [
			percentField("pedDensity", "PED_DENSITY"),
			percentField("scenarioDensity", "SCENARIO_DENSITY"),
			percentField("trafficDensity", "TRAFFIC_DENSITY"),
			percentField("parkedDensity", "PARKED_DENSITY")
		]
	}
], OFFSET = {
	type: "number",
	min: -10,
	max: 10
}, panel = new AdminPanel({
	title: "ADMIN_TITLE",
	icon: "sliders",
	files: {
		settings: {
			kind: "settings",
			sync: "all",
			sections: SETTINGS_SECTIONS,
			defaults: SETTINGS_DEFAULTS
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
		},
		elevators: {
			kind: "records",
			sync: "all",
			labelPath: "label",
			newRecord: {
				label: "",
				floors: []
			},
			sections: {
				label: {
					type: "text",
					min: 1,
					max: 48
				},
				floors: {
					type: "list",
					max: 20,
					of: {
						type: "object",
						fields: {
							label: {
								type: "text",
								min: 1,
								max: 32
							},
							point: { type: "vec4" },
							job: {
								type: "text",
								lookup: "job",
								min: 0,
								max: 32
							}
						}
					}
				}
			}
		},
		moorings: {
			kind: "records",
			sync: "all",
			labelPath: "label",
			newRecord: {
				label: "",
				point: {
					x: 0,
					y: 0,
					z: 0,
					heading: 0
				}
			},
			sections: {
				label: {
					type: "text",
					min: 1,
					max: 48
				},
				point: { type: "vec4" }
			}
		},
		seats: {
			kind: "records",
			sync: "all",
			labelPath: "model",
			newRecord: {
				model: "",
				type: "chair",
				teleport: !1,
				seats: []
			},
			sections: {
				model: {
					type: "text",
					min: 1,
					max: 64
				},
				type: {
					type: "enum",
					values: Object.keys(SEAT_TYPES)
				},
				teleport: { type: "bool" },
				seats: {
					type: "list",
					min: 1,
					max: 12,
					of: {
						type: "object",
						fields: {
							x: OFFSET,
							y: OFFSET,
							z: OFFSET,
							heading: {
								type: "number",
								min: 0,
								max: 360
							}
						}
					}
				}
			}
		}
	},
	tabs: [
		{
			id: "settings",
			file: "settings",
			icon: "sliders",
			label: "ADMIN_TAB_SETTINGS",
			desc: "ADMIN_TAB_SETTINGS_DESC",
			cards: SETTINGS_CARDS
		},
		{
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
		},
		...PLACE_TABS
	]
}), settings = panel.view("settings", readSettings), content = {
	get settings() {
		return settings.value;
	},
	teleports: panel.records("teleports", readTeleport),
	elevators: panel.records("elevators", readElevator),
	moorings: panel.records("moorings", readMooring)
}, Locale = createLocale();
// resource/server/player.ts
GetCurrentResourceName(), IsDuplicityVersion(), onClientEvent(EVENTS.tackle, {
	args: oneArg(readId),
	rate: {
		count: 1,
		windowMs: 3e3
	}
}, (source, target) => {
	content.settings.tackle && target !== source && isOnline(target) && isNear(source, coordsOf(target), 3) && emitNet(EVENTS.tackled, target);
});
const still = new PlayerMap();
every(6e4, function() {
	let minutes = content.settings.afkMinutes;
	if (minutes <= 0) return still.clear();
	let now = Date.now();
	for (let source of online.sources()) {
		let p = coordsOf(source), last = still.get(source);
		!last || distance(last, p) > 1 ? still.set(source, {
			...p,
			since: now
		}) : now - last.since < minutes * 6e4 || IsPlayerAceAllowed(String(source), "ai.admin") || (still.delete(source), DropPlayer(String(source), Locale("SMALL_AFK_KICK", minutes)));
	}
});
// resource/server/places.ts
const hasJob = (source, job) => !job || online.jobs(source).includes(job);
onClientCallback(EVENTS.teleport, {
	args: ([id, end]) => {
		let key = readText(id, 64);
		return key !== null && (end === "from" || end === "to") ? [key, end] : null;
	},
	lock: !0
}, (source, id, end) => {
	let teleport = content.teleports.get(id);
	return !teleport || !isNear(source, teleport[end], 3) ? fail("SMALL_ERR_FAR") : hasJob(source, teleport.job) ? {
		ok: !0,
		to: end === "from" ? teleport.to : teleport.from
	} : fail("SMALL_ERR_JOB");
}), onClientCallback(EVENTS.elevator, {
	args: ([id, from, to]) => {
		let key = readText(id, 64), a = readInt(from, 0, 63), b = readInt(to, 0, 63);
		return key !== null && a !== null && b !== null ? [
			key,
			a,
			b
		] : null;
	},
	lock: !0
}, (source, id, from, to) => {
	let elevator = content.elevators.get(id), start = elevator?.floors[from], floor = elevator?.floors[to];
	return !start || !floor || from === to || !isNear(source, start.point, 3) ? fail("SMALL_ERR_FAR") : hasJob(source, floor.job) ? {
		ok: !0,
		to: floor.point
	} : fail("SMALL_ERR_JOB");
});
// resource/common/items.ts
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
}, hold = new PlayerState("aiHold", stateString), notes = new PendingActions({ minRatio: 0 });
async function placeFirework(source, item) {
	if (!await progressFor(source, {
		label: Locale("SMALL_FIREWORK_PLACING"),
		duration: 3e3,
		anim: {
			dict: "anim@mp_fireworks",
			clip: "place_firework_3_box"
		}
	}) || !inventory.removeItem(source, item, 1)) return;
	let p = coordsOf(source);
	for (let player of playersNear(source, 400)) emitNet(EVENTS.firework, player, p.x, p.y, p.z - .9, item);
	notify(source, Locale("SMALL_FIREWORK_RUN"), "warning", 3e3);
}
onClientCallback(EVENTS.noteSave, {
	args: ([token, text]) => {
		let id = readId(token), note = readText(text, 500);
		return id !== null && note !== null ? [id, note] : null;
	},
	lock: !0
}, (source, token, text) => {
	if (!notes.take(source, token) || !content.settings.notepad || !inventory.hasItem(source, ITEMS.notepad)) return fail("NOTE_ERR_FAILED");
	let metadata = {
		text,
		description: logSafe(text, 60)
	};
	return inventory.canCarryItem(source, ITEMS.note, 1, metadata) ? inventory.addItem(source, ITEMS.note, 1, metadata) ? { ok: !0 } : fail("NOTE_ERR_FAILED") : fail("NOTE_ERR_FULL");
}), inventory.registerUsableItem("binoculars", (source) => (content.settings.binoculars && emitNet(EVENTS.binoculars, source), !1));
for (let item of Object.keys(NEWS_ITEMS)) inventory.registerUsableItem(item, (source) => (hold.set(source, hold.get(source) === item ? void 0 : item), !1));
for (let item of Object.keys(FIREWORKS)) inventory.registerUsableItem(item, (source) => (!content.settings.fireworks || GetVehiclePedIsIn(GetPlayerPed(String(source)), !1) || placeFirework(source, item), !1));
inventory.registerUsableItem(ITEMS.notepad, (source) => (content.settings.notepad && emitNet(EVENTS.noteWrite, source, notes.start(source, ITEMS.notepad, 0)), !1)), inventory.registerUsableItem(ITEMS.note, (source, used) => {
	let text = used.metadata.text;
	return typeof text == "string" && text && emitNet(EVENTS.noteRead, source, text), !1;
});
// resource/server/vehicles.ts
const realPlate = new EntityState(VEHICLE_STATE.realPlate, stateString), moored = new EntityState(VEHICLE_STATE.moored, stateBoolean), plateOf = (vehicle) => GetVehicleNumberPlateText(vehicle).trim();
inventory.registerUsableItem(ITEMS.fakePlate, (source) => {
	if (!content.settings.fakePlate) return !1;
	let ped = GetPlayerPed(String(source)), vehicle = GetVehiclePedIsIn(ped, !1) ? 0 : nearestVehicleTo(source, 3);
	if (!vehicle) return notify(source, Locale("PLATE_ERR_NONE"), "error"), !1;
	let removing = realPlate.get(vehicle) !== void 0;
	return !removing && !vehicleKeys.has(source, vehicle) ? (notify(source, Locale("PLATE_ERR_KEYS"), "error"), !1) : (plateWork(source, vehicle, removing), !1);
});
async function plateWork(source, vehicle, removing) {
	if (!await progressFor(source, {
		label: Locale(removing ? "PLATE_REMOVING" : "PLATE_FITTING"),
		duration: 6e3,
		anim: {
			dict: "anim@amb@clubhouse@tutorial@bkr_tut_ig3@",
			clip: "machinic_loop_mechandplayer",
			flag: 1
		},
		face: entityCoords(vehicle),
		minRatio: .9
	}) || !DoesEntityExist(vehicle) || !isNear(source, entityCoords(vehicle), 4) || realPlate.get(vehicle) !== void 0 !== removing) return;
	let keyHolder = vehicleKeys.has(source, vehicle), shown;
	if (removing) shown = realPlate.get(vehicle) ?? plateOf(vehicle), realPlate.set(vehicle, void 0), inventory.canCarryItem(source, ITEMS.fakePlate, 1) && inventory.addItem(source, ITEMS.fakePlate, 1);
	else {
		if (!inventory.removeItem(source, ITEMS.fakePlate, 1)) return notify(source, Locale("PLATE_ERR_NONE"), "error");
		realPlate.set(vehicle, plateOf(vehicle)), shown = randomPlate();
	}
	SetVehicleNumberPlateText(vehicle, shown), keyHolder && vehicleKeys.give(source, shown, "temporary"), notify(source, Locale(removing ? "PLATE_REMOVED" : "PLATE_FITTED"), "success");
}
onClientCallback(EVENTS.moor, {
	args: oneArg(readId),
	lock: !0
}, (source, netId) => {
	let boat = vehicleFromNet(netId);
	if (!content.settings.boatRope || !boat || GetVehicleType(boat) !== "boat" || !isNear(source, entityCoords(boat), 6)) return fail("SMALL_ERR_FAR");
	let driver = GetPedInVehicleSeat(boat, -1);
	if (driver && driver !== GetPlayerPed(String(source))) return fail("MOOR_ERR_DRIVEN");
	if (moored.get(boat) === !0) return FreezeEntityPosition(boat, !1), moored.set(boat, void 0), { ok: !0 };
	let at = entityCoords(boat), inReach = !1;
	for (let m of content.moorings.values()) distance(m.point, at) <= 14 && (inReach = !0);
	return inReach ? (FreezeEntityPosition(boat, !0), moored.set(boat, !0), { ok: !0 }) : fail("MOOR_ERR_FAR");
});
// resource/server/carry.ts
const carrying = new PlayerState(CARRY_STATE.carrying, stateNumber), carriedBy = new PlayerState(CARRY_STATE.carriedBy, stateNumber), dead = new PlayerState(PLAYER_BAGS.dead, stateBoolean), cuffed = new PlayerState(PLAYER_BAGS.cuffed, stateBoolean), asks = new Cooldowns(), carries = new class {
	agreed = new Set();
	asking = new Set();
	busy(source) {
		return carrying.get(source) !== void 0 || carriedBy.get(source) !== void 0 || this.asking.has(source);
	}
	start(carrier, target, agreed) {
		carrying.set(carrier, target), carriedBy.set(target, carrier), agreed && this.agreed.add(target);
	}
	stop(source, asCarried = !1) {
		let target = carrying.get(source), carrier = carriedBy.get(source);
		if (target !== void 0) this.end(source, target);
		else if (carrier !== void 0 && (!asCarried || this.agreed.has(source))) this.end(carrier, source);
		else return !1;
		return !0;
	}
	async ask(carrier, target) {
		this.asking.add(carrier).add(target);
		let name = online.name(carrier), answer = await triggerClientCallback(EVENTS.carryAsk, target, [name], 1e4).catch(() => !1);
		return this.asking.delete(carrier), this.asking.delete(target), answer === !0;
	}
	end(carrier, target) {
		carrying.set(carrier, void 0), carriedBy.set(target, void 0), this.agreed.delete(target);
	}
}(), nearestFree = (source) => nearestPlayerTo(source, 2, (other) => !carries.busy(other) && !GetVehiclePedIsIn(GetPlayerPed(String(other)), !1));
onClientCallback(EVENTS.carry, async (source) => {
	if (carries.stop(source, !0)) return { ok: !0 };
	if (!content.settings.carry || carries.busy(source) || GetVehiclePedIsIn(GetPlayerPed(String(source)), !1)) return fail("CARRY_ERR_NONE");
	let target = nearestFree(source);
	if (target === null) return fail("CARRY_ERR_NONE");
	let helpless = dead.get(target) === !0 || cuffed.get(target) === !0;
	if (!helpless) {
		if (!asks.ready(source)) return fail("CARRY_ERR_WAIT");
		if (!await carries.ask(source, target)) return asks.start(source, 3e4), fail("CARRY_ERR_DECLINED");
	}
	return carries.busy(source) || carries.busy(target) || !isNear(source, coordsOf(target), 3) ? fail("CARRY_ERR_NONE") : (carries.start(source, target, !helpless), { ok: !0 });
}, { lock: !0 }), onCharacter({ unloaded: (source) => void carries.stop(source) }), on(CORE.playerDiedEvent, (source) => {
	typeof source == "number" && carrying.get(source) !== void 0 && carries.stop(source);
});
