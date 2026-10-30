/*aicore-client-errors*/(function(){var n=GetCurrentResourceName(),s={},c=0;var r=function(t){t=String(t).replace(/\^\d/g,"");var k=t.slice(0,300);if(s[k]||c>=20)return;s[k]=1;c++;try{TriggerServerEvent("ai-core:clientError",n,t.slice(0,4000))}catch(e){}};globalThis.__aicoreReportError=r;var l=console.log;console.log=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("SCRIPT ERROR")!==-1)r(a);return l.apply(console,arguments)}})();
try{
(function() {

// ../../../packages/lib/src/fivem/callbackNames.ts
/**
	* Callback wire format, the same on both sides:
	*   request  `aicore:cb:<name>`              (callerResource, id, ...args)
	*   response `aicore:cbr:<callerResource>`   (id, ok, result)
	* The response goes only to the resource that asked, so two resources never see each other's replies.
	*/
	const requestEvent = (name) => `aicore:cb:${name}`;
	const responseEvent = (resource) => `aicore:cbr:${resource}`;
	/** Default time a caller waits for an answer before the promise rejects. */
	const DEFAULT_CALLBACK_TIMEOUT = 3e4;

// ../../../packages/lib/src/shared/wait.ts
/** Resolves after `ms` milliseconds. */
	function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	/**
	* Resolves with the first value `check` returns that is not undefined, checking once per tick.
	* Rejects after `timeoutMs` (default 10 s); pass `false` to wait forever.
	* Return `cond || undefined` from `check` to wait for a truthy condition.
	*/
	function waitFor(check, timeoutMs = 1e4) {
		return new Promise((resolve, reject) => {
			const started = Date.now();
			const poll = () => {
				const value = check();
				if (value !== void 0) return resolve(value);
				if (timeoutMs !== false && Date.now() - started > timeoutMs) return reject(/* @__PURE__ */ new Error(`waitFor timed out after ${timeoutMs} ms`));
				setTimeout(poll, 0);
			};
			poll();
		});
	}

// ../../../packages/lib/src/shared/read.ts
/** Small readers for panel content (`data/*.json`): every one returns the fallback when the value is missing or wrong. */
	/** A finite number clamped to `[min, max]`, else the fallback. */
	function num(value, fallback, min = -Infinity, max = Infinity) {
		return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
	}
	/** `num` rounded to an integer. */
	function int(value, fallback, min = -Infinity, max = Infinity) {
		return Math.round(num(value, fallback, min, max));
	}
	/** A boolean, else the fallback. */
	function bool(value, fallback) {
		return typeof value === "boolean" ? value : fallback;
	}
	/** A trimmed non-empty string cut to `max`, else the fallback. */
	function str(value, fallback, max = 64) {
		return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
	}
	/** The value as a plain object, or an empty one. */
	function record(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
	}
	/** A position with heading; each missing field comes from the fallback. */
	function vec4(value, fallback) {
		const v = record(value);
		return {
			x: num(v.x, fallback.x),
			y: num(v.y, fallback.y),
			z: num(v.z, fallback.z),
			heading: num(v.heading, fallback.heading)
		};
	}

// ../../../packages/lib/src/shared/index.ts
	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	/** Fills `{0}`, `{1}`... with the arguments by position (a translation may reorder or repeat them). */
	function formatText(template, args) {
		return template.replace(/\{(\d+)\}/g, (match, index) => {
			const value = args[Number(index)];
			return value === void 0 ? match : String(value);
		});
	}
	/** One parsed value as an `args` result: `[value]`, or null to refuse the call. */
	const asArgs = (value) => value === null ? null : [value];
	/** Console output prefixed with the resource name, so server logs show where a line came from. */
	function createLogger(resource) {
		const prefix = `[${resource}]`;
		return {
			info: (message, ...details) => console.log(`${prefix} ${message}`, ...details),
			warn: (message, ...details) => console.warn(`${prefix} ^3${message}^7`, ...details),
			error: (message, ...details) => console.error(`${prefix} ^1${message}^7`, ...details)
		};
	}

// ../../../packages/lib/src/client/netEvent.ts
	const log$2 = createLogger(GetCurrentResourceName());
	/**
	* Whether the net event being handled came from the server (read it before the first `await`). On a client only
	* events from the server carry a source (65535 in the docs); a local emit by any resource carries none.
	*/
	const fromServer = () => Boolean(globalThis.source);
	function onServerEvent(name, first, second) {
		const [handler, parse] = typeof first === "function" ? [first, null] : [second, first.args];
		onNet(name, (...raw) => {
			if (!fromServer() || !handler) return;
			const args = parse ? parse(raw) : [];
			if (!args) return log$2.warn(`event ${name} from the server had invalid arguments`);
			Promise.resolve().then(() => handler(...args)).catch((error) => log$2.error(`event ${name} failed`, error));
		});
	}

// ../../../packages/lib/src/client/callback.ts
	const resource = GetCurrentResourceName();
	const log$1 = createLogger(resource);
	const pending = /* @__PURE__ */ new Map();
	let nextId = 0;
	onNet(responseEvent(resource), (id, ok, result) => {
		if (!fromServer()) return;
		const entry = typeof id === "number" ? pending.get(id) : void 0;
		if (!entry) return;
		pending.delete(id);
		clearTimeout(entry.timer);
		if (ok === true) entry.resolve(result);
		else entry.reject(/* @__PURE__ */ new Error("server callback failed"));
	});
	/**
	* Asks the server (`onClientCallback(name, ...)` there) and resolves with its answer. The answer is unknown:
	* parse it. Rejects when the server reports an error or does not answer within `timeoutMs`.
	*/
	function triggerServerCallback(name, args = [], timeoutMs = DEFAULT_CALLBACK_TIMEOUT) {
		const id = ++nextId;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(/* @__PURE__ */ new Error(`server callback ${name} timed out`));
			}, timeoutMs);
			pending.set(id, {
				resolve,
				reject,
				timer
			});
			emitNet(requestEvent(name), resource, id, ...args);
		});
	}

// ../../../packages/shared/src/core.ts
/** Names owned by ai-core that other resources, the bridges and the build step use. */
	const CORE = {
		resource: "ai-core",
		/** Client -> server: (resource: string, text: string). Sent by the reporter every client bundle carries. */
		clientErrorEvent: "ai-core:clientError",
		/** (src, character: CharacterInfo) after a character is loaded and spawned. */
		playerLoadedEvent: "ai-core:playerLoaded",
		/** (src, charId, reason: UnloadReason) before a character's state is dropped. */
		playerUnloadedEvent: "ai-core:playerUnloaded",
		/** (src, account: string, balance: number, delta: number, reason: string) */
		moneyChangedEvent: "ai-core:moneyChanged",
		/** (src, jobs: JobMembership[]) */
		jobsChangedEvent: "ai-core:jobsChanged",
		/** (src, job: string | null) */
		dutyChangedEvent: "ai-core:dutyChanged",
		/** (src, gangs: GangMembership[]) */
		gangsChangedEvent: "ai-core:gangsChanged",
		/** (src, gang: string | null) */
		activeGangChangedEvent: "ai-core:activeGangChanged",
		/** (src, charIds: number[]) each time a player's character screen loads; an appearance resource answers with portraits. */
		characterScreenEvent: "ai-core:characterScreen",
		clientPlayerLoadedEvent: "ai-core:client:playerLoaded",
		clientPlayerUnloadedEvent: "ai-core:client:playerUnloaded",
		/** (charId: number, url: string) a portrait image of a character on the character screen (e.g. `https://nui-img/<txd>/<txd>`). */
		clientCharacterPortraitEvent: "ai-core:client:characterPortrait",
		/** (resource: string, id: string) the interaction key was pressed while that resource's prompt was on top. */
		clientPromptPressedEvent: "ai-core:client:promptPressed",
		/** (key: keyof PlayerCache, value) a cached value of the local player changed (one watcher in ai-core for every resource). */
		clientCacheEvent: "ai-core:client:cache",
		charactersCallback: "ai-core:characters",
		createCharacterCallback: "ai-core:createCharacter",
		deleteCharacterCallback: "ai-core:deleteCharacter",
		selectCharacterCallback: "ai-core:selectCharacter",
		/** Server -> client: (notification: Notification) a notification card on the player's screen. */
		clientNotifyEvent: "ai-core:client:notify",
		/** Server -> client: (spawn: SpawnPoint) puts the loaded character into the world. */
		spawnEvent: "ai-core:client:spawn",
		/** Server -> client: () the character was let go (switch); show the character screen again. */
		openCharactersEvent: "ai-core:client:openCharacters"
	};

// ../../../packages/shared/src/admin.ts
/** Event names of the admin panel (owned by ai-core). */
	const ADMIN = {
		/** ACE every panel action checks: `add_ace group.admin ai.admin allow`. */
		ace: "ai.admin",
		openCallback: "ai-core:admin:open",
		applyCallback: "ai-core:admin:apply",
		closeEvent: "ai-core:admin:close",
		/** Server -> admins with the panel open: (delta: AdminDelta). */
		deltaEvent: "ai-core:admin:delta",
		/** Server -> client of a world (`sync: "all"`) file: (file, key | null, value). Prefixed with the resource name. */
		worldEvent: (resource) => `${resource}:admin:world`,
		/** Callback: () -> { [file]: { key: value } } world records changed since the resource started. */
		worldChangesCallback: (resource) => `${resource}:admin:worldChanges`
	};

// ../../../packages/shared/src/menu.ts
	const MENU_EVENTS = {
		/** Client local: (resource, requestId, itemId | null) the player picked an item or closed the menu. */
		menuResult: "ai-core:client:menuResult",
		/** Client local: (resource, requestId, itemId) the pointer or focus is on an item (previews). */
		menuHover: "ai-core:client:menuHover",
		/** Client local: (resource, requestId, values | null) the player confirmed or closed the input dialog. */
		inputResult: "ai-core:client:inputResult"
	};

// ../../../packages/lib/src/client/adminWorld.ts
/**
	* The client copy of a resource's world panel files (`sync: "all"`): the file FiveM cached at start, then the
	* records changed since start (asked once), then live changes. Never polls.
	*/
	var AdminWorld = class {
		data = /* @__PURE__ */ new Map();
		handlers = /* @__PURE__ */ new Map();
		resource = GetCurrentResourceName();
		/** `files`: the world files this client mirrors (each must be in the resource's `files`). */
		constructor(files) {
			const log = createLogger(this.resource);
			for (const file of files) {
				const raw = LoadResourceFile(this.resource, `data/${file}.json`);
				try {
					const parsed = raw ? JSON.parse(raw) : {};
					this.data.set(file, isRecord(parsed) ? parsed : {});
				} catch (error) {
					log.error(`data/${file}.json is not valid JSON`, error);
					this.data.set(file, {});
				}
			}
			onServerEvent(ADMIN.worldEvent(this.resource), { args: ([file, key, value]) => typeof file === "string" ? [
				file,
				typeof key === "string" && key !== "" ? key : void 0,
				value
			] : null }, (file, key, value) => this.put(file, key, value));
			triggerServerCallback(ADMIN.worldChangesCallback(this.resource)).then((changes) => {
				if (!isRecord(changes)) return;
				for (const [file, records] of Object.entries(changes)) {
					if (!isRecord(records)) continue;
					for (const [key, value] of Object.entries(records)) this.put(file, key === "" ? void 0 : key, value);
				}
			}, (error) => log.error("loading the panel changes since start failed", error));
		}
		/** The current content of a file: the settings object, or `{ key: record }`. Read only; parse what you use. */
		get(file) {
			return this.data.get(file) ?? {};
		}
		onChange(file, handler) {
			this.handlers.set(file, [...this.handlers.get(file) ?? [], handler]);
		}
		put(file, key, value) {
			const data = this.data.get(file);
			if (!data) return;
			if (key === void 0) {
				if (isRecord(value)) this.data.set(file, value);
			} else if (value === null) delete data[key];
			else data[key] = value;
			for (const handler of this.handlers.get(file) ?? []) handler(key, value);
		}
	};

// ../../../packages/lib/src/client/cache.ts
/** The unarmed "weapon" hash: cached as `false`. */
	const UNARMED = GetHashKey("WEAPON_UNARMED") | 0;
	/** The vehicle, seat and weapon of a ped right now (also ai-core's watcher). */
	function readPlayerState(ped) {
		const vehicle = GetVehiclePedIsIn(ped, false);
		let seat = false;
		if (vehicle) for (let i = -1; i < GetVehicleMaxNumberOfPassengers(vehicle); i++) {
			if (GetPedInVehicleSeat(vehicle, i) !== ped) continue;
			seat = i;
			break;
		}
		const weapon = GetSelectedPedWeapon(ped) | 0;
		return {
			vehicle: vehicle || false,
			seat,
			weapon: weapon === UNARMED ? false : weapon
		};
	}
	/**
	* The local player's often read values (ped, player id, server id, vehicle, seat, weapon), like ox_lib's `cache`:
	* read `cache.ped` instead of calling PlayerPedId() in loops. One watcher in ai-core updates every resource through
	* a local event, so no resource polls for these itself. Read only.
	*/
	const ped = PlayerPedId();
	const cache = {
		ped,
		playerId: PlayerId(),
		serverId: GetPlayerServerId(PlayerId()),
		...readPlayerState(ped)
	};
	const handlers = /* @__PURE__ */ new Map();
	const valid = (key, value) => key === "ped" || key === "playerId" || key === "serverId" ? typeof value === "number" : typeof value === "number" || value === false;
	on(CORE.clientCacheEvent, (key, value) => {
		if (typeof key !== "string" || !(key in cache)) return;
		const name = key;
		if (!valid(name, value) || cache[name] === value) return;
		const old = cache[name];
		cache[name] = value;
		for (const handler of handlers.get(name) ?? []) handler(value, old);
	});
	/** Runs `handler(value, old)` whenever a cached value changes (entering a vehicle, a new ped after a model swap...). */
	function onCache(key, handler) {
		let set = handlers.get(key);
		if (!set) handlers.set(key, set = /* @__PURE__ */ new Set());
		set.add(handler);
	}

// ../../../packages/lib/src/client/zones.ts
/**
	* Zones on this client: inside / outside checks at each zone's own interval, never per frame. Built for any count
	* (measured with 1,000,000 zones): zones sit in a grid of 64 m cells and a check looks only at the player's cell and
	* the zones the player is in.
	*/
	const log = createLogger(GetCurrentResourceName());
	const CELL = 64;
	/** A zone wider than this many cells is kept in one list checked every time instead of in the grid. */
	const MAX_CELLS = 64;
	const cellKey = (cx, cy) => cx + 32768 << 16 | cy + 32768;
	function contains(shape, x, y, z) {
		switch (shape.type) {
			case "sphere": {
				const dx = x - shape.center.x;
				const dy = y - shape.center.y;
				const dz = z - shape.center.z;
				return dx * dx + dy * dy + dz * dz <= shape.radius * shape.radius;
			}
			case "cylinder": {
				const dx = x - shape.center.x;
				const dy = y - shape.center.y;
				return dx * dx + dy * dy <= shape.radius * shape.radius && Math.abs(z - shape.center.z) <= shape.height;
			}
			case "poly": {
				if (z < shape.minZ || z > shape.maxZ) return false;
				let inside = false;
				const p = shape.points;
				for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
					const a = p[i];
					const b = p[j];
					if (a.y > y !== b.y > y && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
				}
				return inside;
			}
			default: return shape;
		}
	}
	/** Ground bounding box of a shape: [minX, minY, maxX, maxY]. */
	function bounds(shape) {
		if (shape.type !== "poly") return [
			shape.center.x - shape.radius,
			shape.center.y - shape.radius,
			shape.center.x + shape.radius,
			shape.center.y + shape.radius
		];
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const p of shape.points) {
			minX = Math.min(minX, p.x);
			minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x);
			maxY = Math.max(maxY, p.y);
		}
		return [
			minX,
			minY,
			maxX,
			maxY
		];
	}
	var Zone = class {
		options;
		inside = false;
		nextCheck = 0;
		interval;
		/** Grid cells the zone is filed under; empty when it is in the large list. */
		cells = [];
		constructor(options) {
			this.options = options;
			this.interval = Math.max(50, options.interval ?? 500);
		}
	};
	/**
	* The zones of one resource. One timer serves them all at the shortest interval any zone asks for; each zone is
	* checked only when its own interval has passed. With no zones the timer stops (an active JS timer costs every frame).
	*/
	var Zones = class {
		zones = /* @__PURE__ */ new Map();
		grid = /* @__PURE__ */ new Map();
		large = /* @__PURE__ */ new Set();
		insideNow = /* @__PURE__ */ new Set();
		/** How many zones use each interval, so the shortest one is found without walking every zone. */
		intervals = /* @__PURE__ */ new Map();
		timer = null;
		period = 0;
		/** Adds (or replaces) a zone. A replaced zone the player was in fires its onExit first. */
		add(id, options) {
			this.remove(id);
			const zone = new Zone(options);
			this.zones.set(id, zone);
			const [minX, minY, maxX, maxY] = bounds(options.shape);
			const x0 = Math.floor(minX / CELL);
			const y0 = Math.floor(minY / CELL);
			const x1 = Math.floor(maxX / CELL);
			const y1 = Math.floor(maxY / CELL);
			if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS) this.large.add(zone);
			else for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
				const key = cellKey(cx, cy);
				let cell = this.grid.get(key);
				if (!cell) this.grid.set(key, cell = /* @__PURE__ */ new Set());
				cell.add(zone);
				zone.cells.push(key);
			}
			this.intervals.set(zone.interval, (this.intervals.get(zone.interval) ?? 0) + 1);
			this.schedule();
		}
		remove(id) {
			const zone = this.zones.get(id);
			if (!zone) return;
			this.zones.delete(id);
			this.large.delete(zone);
			for (const key of zone.cells) {
				const cell = this.grid.get(key);
				cell?.delete(zone);
				if (cell?.size === 0) this.grid.delete(key);
			}
			const left = (this.intervals.get(zone.interval) ?? 1) - 1;
			if (left > 0) this.intervals.set(zone.interval, left);
			else this.intervals.delete(zone.interval);
			if (this.insideNow.delete(zone)) this.fire(zone, false);
			this.schedule();
		}
		/** Removes every zone (exits fire for the ones the player is in). */
		clear() {
			const inside = [...this.insideNow];
			this.zones.clear();
			this.grid.clear();
			this.large.clear();
			this.insideNow.clear();
			this.intervals.clear();
			for (const zone of inside) this.fire(zone, false);
			this.schedule();
		}
		isInside(id) {
			return this.zones.get(id)?.inside ?? false;
		}
		get size() {
			return this.zones.size;
		}
		schedule() {
			let period = 0;
			for (const interval of this.intervals.keys()) period = period === 0 ? interval : Math.min(period, interval);
			if (period === this.period) return;
			if (this.timer) clearInterval(this.timer);
			this.timer = period ? setInterval(() => this.check(), period) : null;
			this.period = period;
		}
		check() {
			const now = GetGameTimer();
			const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
			for (const zone of this.insideNow) this.test(zone, now, x, y, z);
			for (const zone of this.large) this.test(zone, now, x, y, z);
			const cell = this.grid.get(cellKey(Math.floor(x / CELL), Math.floor(y / CELL)));
			if (cell) for (const zone of cell) this.test(zone, now, x, y, z);
		}
		test(zone, now, x, y, z) {
			if (now < zone.nextCheck) return;
			zone.nextCheck = now + zone.interval;
			const inside = contains(zone.options.shape, x, y, z);
			if (inside === zone.inside) return;
			if (inside) this.insideNow.add(zone);
			else this.insideNow.delete(zone);
			this.fire(zone, inside);
		}
		fire(zone, inside) {
			zone.inside = inside;
			try {
				if (inside) zone.options.onEnter?.();
				else zone.options.onExit?.();
			} catch (error) {
				log.error("zone handler failed", error);
			}
		}
	};

// ../../../packages/lib/src/fivem/exports.ts
/** Typed access to another resource's exports (types come from CitizenExports in @aicore-fivem/shared). */
	function resourceExport(resource) {
		return globalThis.exports[resource];
	}

// ../../../packages/lib/src/client/prompt.ts
/**
	* ai-core's prompt (the "press E" box on the right): this resource shows and hides its own prompts by id; the
	* interaction key is one rebindable keybind in ai-core, so nothing polls keys per frame. Show a prompt on a zone's
	* enter, hide it on exit, act in `onPromptPressed`.
	*/
	function showPrompt(id, text) {
		resourceExport(CORE.resource).ShowPrompt(id, text);
	}
	function hidePrompt(id) {
		resourceExport(CORE.resource).HidePrompt(id);
	}
	/** The player pressed the interaction key while this resource's prompt `id` was the one on top. */
	function onPromptPressed(handler) {
		const resource = GetCurrentResourceName();
		on(CORE.clientPromptPressedEvent, (owner, id) => {
			if (owner === resource && typeof id === "string") handler(id);
		});
	}

// ../../../packages/lib/src/client/streaming.ts
/**
	* Loads a model and resolves with its hash. Rejects when the model does not exist or does not load in time.
	* Call `SetModelAsNoLongerNeeded(hash)` once the entity is created.
	*/
	async function requestModel(model, timeoutMs = 1e4) {
		const hash = typeof model === "number" ? model : GetHashKey(model);
		if (!IsModelInCdimage(hash)) throw new Error(`model ${model} does not exist`);
		RequestModel(hash);
		await waitFor(() => HasModelLoaded(hash) || void 0, timeoutMs);
		return hash;
	}
	/** Loads an animation dictionary. Call `RemoveAnimDict(dict)` when it is no longer played. */
	async function requestAnimDict(dict, timeoutMs = 1e4) {
		if (!DoesAnimDictExist(dict)) throw new Error(`anim dict ${dict} does not exist`);
		RequestAnimDict(dict);
		await waitFor(() => HasAnimDictLoaded(dict) || void 0, timeoutMs);
		return dict;
	}
	/** Loads a particle asset. Call `RemoveNamedPtfxAsset(asset)` when done. */
	async function requestPtfxAsset(asset, timeoutMs = 1e4) {
		RequestNamedPtfxAsset(asset);
		await waitFor(() => HasNamedPtfxAssetLoaded(asset) || void 0, timeoutMs);
		return asset;
	}

// ../../../packages/lib/src/client/notify.ts
/** Shows a notification card on this player's screen (ai-core draws it); `text` is already translated. */
	function notify(text, kind = "info", duration) {
		resourceExport(CORE.resource).Notify({
			text,
			kind,
			duration
		});
	}
	/**
	* Runs a timed action with ai-core's progress bar and an optional animation; resolves true when it ran out, false
	* when cancelled (death, getting into a vehicle). Checks ten times a second, nothing per frame.
	*/
	async function progress(options) {
		const core = resourceExport(CORE.resource);
		const ped = cache.ped;
		if (options.anim) {
			await requestAnimDict(options.anim.dict);
			TaskPlayAnim(ped, options.anim.dict, options.anim.clip, 3, 3, options.duration, options.anim.flag ?? 49, 0, false, false, false);
		}
		core.ShowProgress(options.label, options.duration);
		const end = GetGameTimer() + options.duration;
		const done = await new Promise((resolve) => {
			const timer = setInterval(() => {
				const cancelled = IsEntityDead(cache.ped) || !options.allowVehicle && cache.vehicle !== false;
				if (!cancelled && GetGameTimer() < end) return;
				clearInterval(timer);
				resolve(!cancelled);
			}, 100);
		});
		if (options.anim) StopAnimTask(ped, options.anim.dict, options.anim.clip, 1);
		core.HideProgress();
		return done;
	}

// ../../../packages/lib/src/client/menu.ts
/** Menus and input dialogs this resource asked ai-core for, waiting for the player's answer. */
	var Requests = class {
		resource = GetCurrentResourceName();
		waiting = /* @__PURE__ */ new Map();
		hovers = /* @__PURE__ */ new Map();
		nextId = 0;
		constructor() {
			const answer = (owner, id, value) => {
				if (owner !== this.resource || typeof id !== "number") return;
				this.waiting.get(id)?.(value);
				this.waiting.delete(id);
				this.hovers.delete(id);
			};
			on(MENU_EVENTS.menuHover, (owner, id, item) => {
				if (owner === this.resource && typeof id === "number" && typeof item === "string") this.hovers.get(id)?.(item);
			});
			on(MENU_EVENTS.menuResult, answer);
			on(MENU_EVENTS.inputResult, answer);
		}
		ask(open, read, onHover) {
			const id = ++this.nextId;
			this.waiting.set(id, read);
			if (onHover) this.hovers.set(id, onHover);
			open(id);
		}
	};
	const requests = new Requests();

// ../../../packages/lib/src/client/vehicleProps.ts
	const MOD_TYPES = Array.from({ length: 50 }, (_, i) => i);

// ../../../packages/lib/src/client/keybind.ts
/** A key the player can rebind in GTA's settings (RegisterKeyMapping); no per-frame key polling. */
	var Keybind = class {
		options;
		name;
		disabled;
		pressed = false;
		hash;
		constructor(options) {
			this.options = options;
			this.name = options.name;
			this.disabled = options.disabled ?? false;
			this.hash = GetHashKey(`+${options.name}`) | 2147483648;
			RegisterCommand(`+${options.name}`, () => this.press(true), false);
			RegisterCommand(`-${options.name}`, () => this.press(false), false);
			RegisterKeyMapping(`+${options.name}`, options.description, options.defaultMapper ?? "keyboard", options.defaultKey ?? "");
			setTimeout(() => {
				emit("chat:removeSuggestion", `/+${options.name}`);
				emit("chat:removeSuggestion", `/-${options.name}`);
			}, 500);
		}
		press(down) {
			if (this.disabled || !this.options.allowInPauseMenu && IsPauseMenuActive()) return;
			this.pressed = down;
			if (down) this.options.onPressed?.();
			else this.options.onReleased?.();
		}
		/** Whether the key is held now. */
		get isPressed() {
			return this.pressed;
		}
		/** The key the player has bound right now, for HUD hints. */
		get currentKey() {
			return GetControlInstructionalButton(0, this.hash, true).substring(2);
		}
		disable(disabled) {
			this.disabled = disabled;
			this.pressed = false;
		}
	};

// ../../../packages/lib/src/fivem/locale.ts
/** Convar holding the language (`setr ai:locale "en"` in misc.cfg); replicated so clients read it too. */
	const LOCALE_CONVAR = "ai:locale";
	function readLocaleFile(resource, lang) {
		const raw = LoadResourceFile(resource, `locales/${lang}.json`);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (!isRecord(parsed)) return {};
		const texts = {};
		for (const [key, value] of Object.entries(parsed)) if (typeof value === "string") texts[key] = value;
		return texts;
	}
	/**
	* The resource's lang texts: `locales/en.json` (complete base) overlaid with `locales/<ai:locale>.json`.
	* `${OTHER_KEY}` inside a text is replaced by that text once at load. Returns `t(key, ...args)` filling
	* `{0}`, `{1}`...; a missing key returns the key itself so it is visible in game.
	*
	*   const t = createLocale<typeof import("../../locales/en.json")>();
	*   t("NOTIFY_NO_MONEY", price);
	*/
	function createLocale() {
		const texts = loadLocaleTexts();
		return (key, ...args) => formatText(texts[key] ?? key, args);
	}
	/**
	* The resource's merged lang table (`en.json` overlaid with the `ai:locale` language, `${KEY}` references
	* resolved). A NUI gets this once and fills `{0}` placeholders itself.
	*/
	function loadLocaleTexts(resource = GetCurrentResourceName()) {
		const lang = GetConvar(LOCALE_CONVAR, "en");
		const texts = {
			...readLocaleFile(resource, "en"),
			...lang === "en" ? {} : readLocaleFile(resource, lang)
		};
		for (const key of Object.keys(texts)) texts[key] = (texts[key] ?? "").replace(/\$\{([A-Z0-9_]+)\}/g, (match, ref) => texts[ref] ?? match);
		return texts;
	}

// ../../../packages/lib/src/client/index.ts
/** Client-only helpers. Import from "@aicore-fivem/lib/client". */
	/** A per-frame job that can be switched on and off without leaking ticks (an idle tick still costs time). */
	var TickLoop = class {
		onFrame;
		id = null;
		constructor(onFrame) {
			this.onFrame = onFrame;
		}
		get running() {
			return this.id !== null;
		}
		set(active) {
			if (active && this.id === null) this.id = setTick(this.onFrame);
			else if (!active && this.id !== null) {
				clearTick(this.id);
				this.id = null;
			}
		}
	};

// resource/common/locale.ts
/** This resource's lang texts: `Locale("NOTIFY_NO_MONEY", price)`; keys typed from locales/en.json. */
	const Locale = createLocale();

// resource/common/resource.ts
	const ResourceName = GetCurrentResourceName();
	const ResourceContext = IsDuplicityVersion() ? "server" : "client";

// resource/common/small.ts
/** ai-smallresources' contracts and panel content. No natives. */
	const EVENTS = {
		/** Client -> server: (targetServerId) tackle the player in front. */
		tackle: "ai-smallresources:tackle",
		/** Server -> tackled player: () fall down. */
		tackled: "ai-smallresources:client:tackled",
		/** Callback: (teleportId, end: "from" | "to") -> { ok } go to the other end. */
		teleport: "ai-smallresources:teleport",
		/** Server -> player: () the binoculars item was used. */
		binoculars: "ai-smallresources:client:binoculars",
		/** Server -> player: (token) place the firework (progress). */
		fireworkPlace: "ai-smallresources:client:fireworkPlace",
		/** Callback: (token) -> { ok } the firework is placed. */
		fireworkPlaced: "ai-smallresources:fireworkPlaced",
		/** Server -> players nearby: (x, y, z, item) a firework item goes off there. */
		firework: "ai-smallresources:client:firework"
	};
	function readSettings(raw) {
		const v = record(raw);
		return {
			seatbelt: bool(v.seatbelt, true),
			ejectUnbelted: int(v.ejectUnbelted, 20, 0, 500),
			ejectBelted: int(v.ejectBelted, 160, 0, 500),
			cruise: bool(v.cruise, true),
			crouch: bool(v.crouch, true),
			noShuffle: bool(v.noShuffle, true),
			noDispatch: bool(v.noDispatch, true),
			hideHud: bool(v.hideHud, true),
			tackle: bool(v.tackle, true),
			afkMinutes: int(v.afkMinutes, 20, 0, 600),
			binoculars: bool(v.binoculars, true),
			fireworks: bool(v.fireworks, true)
		};
	}
	function readTeleports(raw) {
		const out = /* @__PURE__ */ new Map();
		const zero = {
			x: 0,
			y: 0,
			z: 0,
			heading: 0
		};
		for (const [id, value] of Object.entries(record(raw))) {
			const v = record(value);
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
	/** Player state key (server written): the news item the player holds, or false. */
	const HOLD_STATE = "aiHold";
	/** News items: the prop, where it sits on the ped and the animation the holder plays. */
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
	};
	/** Firework items and the particle asset and effects each one shows. */
	const FIREWORKS = {
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
	};

// resource/client/settings.ts
/** The panel files every client module reads; `onSettings` handlers run after each change. */
	const world = new AdminWorld(["settings", "teleports"]);
	const content = {
		settings: readSettings(world.get("settings")),
		teleports: readTeleports(world.get("teleports"))
	};
	const settingsHandlers = [];
	const teleportHandlers = [];
	world.onChange("settings", () => {
		content.settings = readSettings(world.get("settings"));
		for (const handler of settingsHandlers) handler();
	});
	world.onChange("teleports", () => {
		content.teleports = readTeleports(world.get("teleports"));
		for (const handler of teleportHandlers) handler();
	});
	const onSettings = (handler) => settingsHandlers.push(handler);
	const onTeleports = (handler) => teleportHandlers.push(handler);

// resource/client/driving.ts
/** Vehicle classes without a seatbelt: motorcycles, cycles, boats, helicopters, planes, trains. */
	const NO_BELT = /* @__PURE__ */ new Set([
		8,
		13,
		14,
		15,
		16,
		21
	]);
	/**
	* Seatbelt (GTA's own windscreen ejection with a higher speed when buckled; the exit key is blocked while buckled)
	* and cruise control (the vehicle's top speed held at the speed it had). The HUD reads the local `seatbelt` state.
	*/
	var Driving = class {
		belted = false;
		cruising = false;
		blockExit = new TickLoop(() => {
			DisableControlAction(0, 75, true);
			DisableControlAction(27, 75, true);
		});
		constructor() {
			this.applyEject();
			onSettings(() => this.applyEject());
			onCache("vehicle", (vehicle) => {
				if (vehicle === false) this.reset();
			});
		}
		applyEject() {
			if (!content.settings.seatbelt && this.belted) this.setBelt(false);
			LocalPlayer.state.set("seatbelt", content.settings.seatbelt ? this.belted : null, false);
			const kmh = this.belted ? content.settings.ejectBelted : content.settings.ejectUnbelted;
			SetFlyThroughWindscreenParams(kmh / 3.6, 1, 17, 10);
		}
		reset() {
			if (this.belted) this.setBelt(false);
			this.cruising = false;
		}
		setBelt(on) {
			this.belted = on;
			this.blockExit.set(on);
			this.applyEject();
		}
		toggleBelt() {
			if (!content.settings.seatbelt || cache.vehicle === false || NO_BELT.has(GetVehicleClass(cache.vehicle))) return;
			this.setBelt(!this.belted);
			notify(Locale(this.belted ? "SMALL_BELT_ON" : "SMALL_BELT_OFF"), "info", 1500);
		}
		toggleCruise() {
			const vehicle = cache.vehicle;
			if (!content.settings.cruise || vehicle === false || GetPedInVehicleSeat(vehicle, -1) !== cache.ped) return;
			this.cruising = !this.cruising;
			SetVehicleMaxSpeed(vehicle, this.cruising ? GetEntitySpeed(vehicle) : 0);
			notify(Locale(this.cruising ? "SMALL_CRUISE_ON" : "SMALL_CRUISE_OFF"), "info", 1500);
		}
	};
	const driving = new Driving();
	on("onResourceStop", (resource) => resource === ResourceName && LocalPlayer.state.set("seatbelt", null, false));
	new Keybind({
		name: "smallresources_belt_B",
		description: Locale("KEYBIND_SEATBELT"),
		defaultKey: "B",
		onPressed: () => driving.toggleBelt()
	});
	new Keybind({
		name: "smallresources_cruise_Y",
		description: Locale("KEYBIND_CRUISE"),
		defaultKey: "Y",
		onPressed: () => driving.toggleCruise()
	});
	/** Passengers stay in their seat when the driver seat empties. */
	const noShuffle = () => SetPedConfigFlag(cache.ped, 184, content.settings.noShuffle);
	noShuffle();
	onCache("ped", noShuffle);
	onSettings(noShuffle);

// resource/client/player.ts
	const CROUCH = "move_ped_crouched";
	/** Crouch walk toggled with a key. */
	var Crouch = class {
		crouched = false;
		async toggle() {
			if (!content.settings.crouch || cache.vehicle !== false || IsPedSwimming(cache.ped)) return;
			this.crouched = !this.crouched;
			if (!this.crouched) return ResetPedMovementClipset(cache.ped, .25);
			RequestAnimSet(CROUCH);
			await waitFor(() => HasAnimSetLoaded(CROUCH) || void 0, 3e3).catch(() => false);
			SetPedMovementClipset(cache.ped, CROUCH, .25);
		}
	};
	const crouch = new Crouch();
	new Keybind({
		name: "smallresources_crouch_X",
		description: Locale("KEYBIND_CROUCH"),
		defaultKey: "X",
		onPressed: () => void crouch.toggle()
	});
	/** Sprinting into a player in front knocks both down; the server checks the distance. */
	async function tackle() {
		if (!content.settings.tackle || cache.vehicle !== false || !IsPedSprinting(cache.ped)) return;
		const [x = 0, y = 0, z = 0] = GetOffsetFromEntityInWorldCoords(cache.ped, 0, 1.2, 0);
		const target = GetActivePlayers().find((player) => {
			if (player === cache.playerId) return false;
			const [px = 0, py = 0, pz = 0] = GetEntityCoords(GetPlayerPed(player), false);
			return Math.hypot(px - x, py - y, pz - z) <= 1.6;
		});
		if (target === void 0) return;
		emitNet(EVENTS.tackle, GetPlayerServerId(target));
		const dict = await requestAnimDict("missmic2ig_11");
		TaskPlayAnim(cache.ped, dict, "mic_2_ig_11_intro_goon", 8, -8, 1200, 0, 0, false, false, false);
		setTimeout(() => SetPedToRagdoll(cache.ped, 1e3, 1e3, 0, false, false, false), 700);
	}
	new Keybind({
		name: "smallresources_tackle_G",
		description: Locale("KEYBIND_TACKLE"),
		defaultKey: "G",
		onPressed: () => void tackle()
	});
	onServerEvent(EVENTS.tackled, () => SetPedToRagdoll(cache.ped, 3e3, 3e3, 0, false, false, false));
	/** No police, ambulance or fire dispatch and no wanted level; GTA's own HUD pieces the ai-hud replaces stay hidden. */
	const HIDDEN_HUD = [
		1,
		2,
		3,
		4,
		6,
		7,
		8,
		9,
		13,
		17,
		20
	];
	const hideHud = new TickLoop(() => {
		for (const component of HIDDEN_HUD) HideHudComponentThisFrame(component);
	});
	function applyWorld() {
		const off = content.settings.noDispatch;
		for (let service = 1; service <= 15; service++) EnableDispatchService(service, !off);
		SetMaxWantedLevel(off ? 0 : 5);
		hideHud.set(content.settings.hideHud);
	}
	applyWorld();
	onSettings(applyWorld);

// resource/client/items.ts
	const MAX_FOV = 70;
	const MIN_FOV = 5;
	/**
	* A handheld camera view: the binoculars item (binocular overlay, scenario) or the held news camera (news overlay,
	* the holding animation keeps running); scroll zooms, Backspace closes.
	*/
	var Binoculars = class {
		cam = 0;
		scaleform = 0;
		fov = 75 / 2;
		frame = new TickLoop(() => this.draw());
		get active() {
			return this.cam !== 0;
		}
		news = false;
		open(news = false) {
			if (this.active || cache.vehicle !== false || IsPedSwimming(cache.ped)) return;
			this.news = news;
			if (!news) TaskStartScenarioInPlace(cache.ped, "WORLD_HUMAN_BINOCULARS", 0, true);
			this.cam = CreateCam("DEFAULT_SCRIPTED_FLY_CAMERA", true);
			AttachCamToEntity(this.cam, cache.ped, 0, .2, .7, true);
			SetCamRot(this.cam, 0, 0, GetEntityHeading(cache.ped), 2);
			SetCamFov(this.cam, this.fov);
			RenderScriptCams(true, false, 500, true, false);
			this.scaleform = RequestScaleformMovie(news ? "BREAKING_NEWS" : "BINOCULARS");
			this.frame.set(true);
		}
		close() {
			if (!this.active) return;
			this.frame.set(false);
			if (!this.news) ClearPedTasks(cache.ped);
			RenderScriptCams(false, false, 500, true, false);
			DestroyCam(this.cam, false);
			SetScaleformMovieAsNoLongerNeeded(this.scaleform);
			this.cam = 0;
			this.fov = 75 / 2;
		}
		draw() {
			const zoom = (this.fov - MIN_FOV) / 65;
			const x = GetDisabledControlNormal(0, 220);
			const y = GetDisabledControlNormal(0, 221);
			if (x !== 0 || y !== 0) {
				const [rx = 0, , rz = 0] = GetCamRot(this.cam, 2);
				const heading = rz - x * 8 * (zoom + .1);
				SetCamRot(this.cam, Math.max(-89.5, Math.min(20, rx - y * 8 * (zoom + .1))), 0, heading, 2);
				SetEntityHeading(cache.ped, heading);
			}
			if (IsControlJustPressed(0, 241)) this.fov = Math.max(MIN_FOV, this.fov - 10);
			if (IsControlJustPressed(0, 242)) this.fov = Math.min(MAX_FOV, this.fov + 10);
			SetCamFov(this.cam, GetCamFov(this.cam) + (this.fov - GetCamFov(this.cam)) * .05);
			HideHudAndRadarThisFrame();
			if (HasScaleformMovieLoaded(this.scaleform)) DrawScaleformMovieFullscreen(this.scaleform, 255, 255, 255, 255, 0);
		}
	};
	const binoculars = new Binoculars();
	onServerEvent(EVENTS.binoculars, () => binoculars.active ? binoculars.close() : binoculars.open());
	new Keybind({
		name: "smallresources_binoculars_BACK",
		description: Locale("KEYBIND_BINOCULARS_CLOSE"),
		defaultKey: "BACK",
		onPressed: () => binoculars.close()
	});
	onServerEvent(EVENTS.fireworkPlace, { args: ([token]) => asArgs(typeof token === "number" ? token : null) }, async (token) => {
		if (!await progress({
			label: Locale("SMALL_FIREWORK_PLACING"),
			duration: 3e3,
			anim: {
				dict: "anim@mp_fireworks",
				clip: "place_firework_3_box"
			}
		})) return;
		if (record(await triggerServerCallback(EVENTS.fireworkPlaced, [token]).catch(() => null)).ok === true) notify(Locale("SMALL_FIREWORK_RUN"), "warning", 3e3);
	});
	/** A firework someone placed nearby: after a short fuse, a burst of effects high above it. */
	onServerEvent(EVENTS.firework, { args: ([x, y, z, item]) => typeof x === "number" && typeof y === "number" && typeof z === "number" && typeof item === "string" && item in FIREWORKS ? [
		x,
		y,
		z,
		item
	] : null }, async (x, y, z, item) => {
		const firework = FIREWORKS[item];
		if (!firework) return;
		const asset = await requestPtfxAsset(firework.asset).catch(() => null);
		if (!asset) return;
		await sleep(5e3);
		for (let i = 0; i < 12; i++) {
			const effect = firework.effects[Math.floor(Math.random() * firework.effects.length)] ?? "";
			UseParticleFxAsset(asset);
			StartParticleFxNonLoopedAtCoord(effect, x, y, z + 40 + Math.random() * 15, 0, 0, 0, .5 + Math.random() * .3, false, false, false);
			await sleep(900);
		}
		RemoveNamedPtfxAsset(asset);
	});

// resource/client/news.ts
/**
	* News camera, microphone and boom: the server writes what a player holds into their state; every client puts a local
	* prop in that player's hand, the holder also plays the animation. Holding the camera, H opens the news view.
	*/
	var NewsGear = class {
		props = /* @__PURE__ */ new Map();
		held = null;
		async apply(player, item) {
			const old = this.props.get(player);
			if (old) DeleteObject(old);
			this.props.delete(player);
			const ped = GetPlayerPed(player);
			const mine = player === cache.playerId;
			if (mine) {
				if (this.held) ClearPedTasks(cache.ped);
				if (binoculars.active) binoculars.close();
				this.held = item;
			}
			const gear = item ? NEWS_ITEMS[item] : void 0;
			if (!gear || !ped) return;
			const model = await requestModel(gear.model).catch(() => 0);
			if (!model) return;
			const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, false);
			const prop = CreateObject(model, x, y, z, false, false, false);
			const [ox, oy, oz, rx, ry, rz] = gear.offset;
			AttachEntityToEntity(prop, ped, GetPedBoneIndex(ped, gear.bone), ox, oy, oz, rx, ry, rz, true, true, false, true, 0, true);
			SetModelAsNoLongerNeeded(model);
			this.props.set(player, prop);
			if (mine) {
				const dict = await requestAnimDict(gear.dict);
				TaskPlayAnim(cache.ped, dict, gear.clip, 1, -1, -1, 50, 0, false, false, false);
			}
		}
		view() {
			if (this.held !== "newscam") return;
			if (binoculars.active) binoculars.close();
			else binoculars.open(true);
		}
	};
	const gear = new NewsGear();
	AddStateBagChangeHandler(HOLD_STATE, "", (bagName, _key, value) => {
		const player = GetPlayerFromStateBagName(bagName);
		if (NetworkIsPlayerActive(player)) gear.apply(player, typeof value === "string" ? value : null);
	});
	new Keybind({
		name: "smallresources_newsview_H",
		description: Locale("KEYBIND_NEWS_VIEW"),
		defaultKey: "H",
		onPressed: () => gear.view()
	});

// resource/client/teleports.ts
	const texts = loadLocaleTexts();
	/** A prompt at both ends of every teleport; the server moves the player to the other end behind a fade. */
	var Teleports = class {
		zones = new Zones();
		busy = false;
		rebuild() {
			this.zones.clear();
			for (const teleport of content.teleports.values()) for (const end of ["from", "to"]) {
				const id = `tp:${teleport.id}:${end}`;
				this.zones.add(id, {
					shape: {
						type: "sphere",
						center: teleport[end],
						radius: 1.5
					},
					interval: 400,
					onEnter: () => showPrompt(id, Locale("SMALL_PROMPT_TELEPORT", teleport.label)),
					onExit: () => hidePrompt(id)
				});
			}
		}
		async use(id, end) {
			if (this.busy) return;
			this.busy = true;
			DoScreenFadeOut(300);
			await sleep(350);
			const result = record(await triggerServerCallback(EVENTS.teleport, [id, end]).catch(() => null));
			if (result.ok !== true) {
				const key = typeof result.error === "string" ? result.error : "SMALL_ERR_FAR";
				notify(texts[key] ?? key, "error");
			} else await sleep(500);
			DoScreenFadeIn(300);
			this.busy = false;
		}
	};
	const teleports = new Teleports();
	teleports.rebuild();
	onTeleports(() => teleports.rebuild());
	onPromptPressed((prompt) => {
		const [kind, id = "", end] = prompt.split(":");
		if (kind === "tp" && (end === "from" || end === "to")) teleports.use(id, end);
	});

})();
}catch(e){globalThis.__aicoreReportError&&globalThis.__aicoreReportError("load: "+(e&&e.stack||e));throw e}
