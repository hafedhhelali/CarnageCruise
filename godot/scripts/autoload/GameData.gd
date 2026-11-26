extends Node

signal state_changed

const SAVE_PATH := "user://carnage_save.json"
const PARITY_PATH := "res://data/parity.json"

var cities: Array = []
var bikes: Array = []
var biomes: Dictionary = {}
var challenges: Dictionary = {}
var missions: Array = []
var characters: Array = []

var save_data: Dictionary = {
	"coins": 500,
	"selected_city": "paris",
	"selected_bike": "tank",
	"unlocked_cities": ["paris", "lyon", "marseille", "nice", "saint_malo", "tunis", "alger", "beyrouth"],
	"unlocked_bikes": ["tank", "aero_jet", "hovercraft", "rad_rover", "decapotable", "cheval", "rouleau", "dragster"],
	"city_scores": {},
	"city_stars": {},
	"city_destruction": {},
	"exterminated_cities": [],
	"settings": {
		"music": true,
		"sfx": true,
		"vibration": true,
		"control_mode": "swipe",
		"quality": "AUTO",
		"camera_shake": true
	},
	"stats": {
		"total_kills": 0,
		"total_distance": 0.0,
		"runs": 0
	}
}

# Active run state
var current_mode := "SPLASH" # SPLASH, MAP, GARAGE, PLAYING, PAUSED, RESULTS
var selected_city: Dictionary = {}
var selected_bike: Dictionary = {}
var challenge_mode := "STANDARD"

var score: int = 0
var combo: int = 1
var max_combo: int = 1
var combo_timer: float = 0.0
var kills: int = 0
var distance: float = 0.0
var speed: float = 0.0
var max_speed: float = 20.0
var is_braking := false
var is_nitro_active := false
var nitro_charge: float = 0.0
var nitro_timer: float = 0.0
var wanted_level: int = 0
var coins_earned: int = 0
var finish_distance: float = 1650.0


func _ready() -> void:
	_load_parity()
	_load_save()
	select_city(save_data.get("selected_city", "paris"))
	select_bike(save_data.get("selected_bike", "tank"))


func _load_parity() -> void:
	if not FileAccess.file_exists(PARITY_PATH):
		push_error("Missing parity.json at " + PARITY_PATH)
		return
	var txt := FileAccess.get_file_as_string(PARITY_PATH)
	var parsed = JSON.parse_string(txt)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Invalid parity.json format")
		return
	cities = parsed.get("cities", [])
	bikes = parsed.get("bikes", [])
	biomes = parsed.get("biomes", {})
	challenges = parsed.get("challenges", {})
	missions = parsed.get("missions", [])
	characters = parsed.get("characters", [])


func _load_save() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(parsed) == TYPE_DICTIONARY:
		for k in parsed.keys():
			if k == "settings" and typeof(parsed[k]) == TYPE_DICTIONARY:
				save_data["settings"].merge(parsed[k], true)
			elif k == "stats" and typeof(parsed[k]) == TYPE_DICTIONARY:
				save_data["stats"].merge(parsed[k], true)
			else:
				save_data[k] = parsed[k]


func write_save() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(save_data))
		f.close()


func select_city(city_id: String) -> void:
	for c in cities:
		if c.get("id") == city_id:
			selected_city = c
			save_data["selected_city"] = city_id
			write_save()
			state_changed.emit()
			return
	if cities.size() > 0:
		selected_city = cities[0]


func select_bike(bike_id: String) -> void:
	for b in bikes:
		if b.get("id") == bike_id:
			selected_bike = b
			max_speed = float(b.get("maxSpeed", 20.0))
			save_data["selected_bike"] = bike_id
			write_save()
			state_changed.emit()
			return
	if bikes.size() > 0:
		selected_bike = bikes[0]
		max_speed = float(selected_bike.get("maxSpeed", 20.0))


func get_city_region(city_def: Dictionary) -> String:
	var region: String = str(city_def.get("region", "")).to_upper()
	if region == "AFRIQUE DU NORD" or region == "MAGHREB":
		return "AFRIQUE DU NORD"
	if region == "PROCHE-ORIENT" or region == "LEVANT":
		return "PROCHE-ORIENT"
	return "EUROPE"


func get_city_biome(city_def: Dictionary) -> String:
	if city_def.has("biome"):
		return str(city_def["biome"])
	var id := str(city_def.get("id", ""))
	if id in ["nice", "marseille", "napoli", "alger", "tunis", "beyrouth", "alexandrie"]:
		return "corniche"
	if id in ["marrakech", "louxor", "assouan", "petra", "bagdad"]:
		return "desert"
	if id in ["chamonix", "innsbruck", "reykjavik"]:
		return "cliffs"
	return "park"


func start_run(city_id: String = "", challenge: String = "STANDARD") -> void:
	if city_id != "":
		select_city(city_id)
	challenge_mode = challenge
	score = 0
	combo = 1
	max_combo = 1
	combo_timer = 0.0
	kills = 0
	distance = 0.0
	speed = 0.0
	is_braking = false
	is_nitro_active = false
	nitro_charge = 35.0
	nitro_timer = 0.0
	wanted_level = 1 if challenge == "POLICE_PURSUIT" else 0
	coins_earned = 0
	var is_cat := bool(selected_city.get("isNuclearMission", false)) or bool(selected_city.get("isDamMission", false)) or bool(selected_city.get("isMountainMission", false))
	finish_distance = 1350.0 if is_cat else 1650.0
	current_mode = "PLAYING"
	state_changed.emit()


func add_score(base_pts: int, is_kill: bool = false) -> int:
	if is_kill:
		kills += 1
		combo = mini(25, combo + 1)
		max_combo = maxi(max_combo, combo)
		combo_timer = 3.2
		nitro_charge = minf(100.0, nitro_charge + 11.0)
	var mult := 1.0 + float(combo - 1) * 0.25
	var pts := int(round(float(base_pts) * mult))
	score += pts
	coins_earned += maxi(1, int(pts / 45))
	return pts


func end_run(reached_finish: bool = false) -> Dictionary:
	current_mode = "RESULTS"
	speed = 0.0
	is_braking = false
	is_nitro_active = false
	var cid := str(selected_city.get("id", "paris"))
	var target := int(selected_city.get("targetScore", 26000))
	var pct := clampf(float(score) / float(maxi(1, target)) * 100.0, 0.0, 100.0)
	var stars := 0
	if pct >= 100.0:
		stars = 3
	elif pct >= 60.0:
		stars = 2
	elif pct >= 25.0 or reached_finish:
		stars = 1

	var prev_best := int(save_data["city_scores"].get(cid, 0))
	if score > prev_best:
		save_data["city_scores"][cid] = score
	var prev_stars := int(save_data["city_stars"].get(cid, 0))
	if stars > prev_stars:
		save_data["city_stars"][cid] = stars
	var prev_dest := float(save_data["city_destruction"].get(cid, 0.0))
	if pct > prev_dest:
		save_data["city_destruction"][cid] = pct
	if pct >= 100.0 and not (cid in save_data["exterminated_cities"]):
		save_data["exterminated_cities"].append(cid)

	save_data["coins"] = int(save_data.get("coins", 0)) + coins_earned
	save_data["stats"]["total_kills"] = int(save_data["stats"].get("total_kills", 0)) + kills
	save_data["stats"]["total_distance"] = float(save_data["stats"].get("total_distance", 0.0)) + distance
	save_data["stats"]["runs"] = int(save_data["stats"].get("runs", 0)) + 1
	write_save()
	state_changed.emit()
	return {"score": score, "stars": stars, "pct": pct, "kills": kills, "coins": coins_earned, "max_combo": max_combo}
