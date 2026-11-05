#!/usr/bin/env python3
"""Build the explore/ spot pages and the "Explore Singapore" section of the Area page.

The words live in tools/explore/<lang>.txt, one file per language. Everything
else (which list a spot is in, its directions and its official website) is in
SPOTS below. After editing either, run this from anywhere:

    python3 tools/build_explore.py

It rewrites explore/ and <lang>/explore/, the section between the explore
markers in each area.html, and the explore entries in sitemap.xml. It takes the
head, closing "Make it home" section and ?v= stamp from each language's area.html.
"""

import datetime
import html
import re
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://22je.sg/"
HOUSE = "22+Jln+Elok,+Singapore+229060"
NPARKS = "https://www.nparks.gov.sg/"
GBTB = "https://www.gardensbythebay.com.sg/en/"
WIKI = "https://en.wikipedia.org/wiki/"
VISIT = "https://www.visitsingapore.com/"
LBRD = "https://littlebigreddot.com/"
LTA_MAP = ("LTA MRT map", "https://www.lta.gov.sg/content/ltagov/en/map/train.html")
HREFLANG = {"en": "en", "zh": "zh-Hans", "ja": "ja", "es": "es", "fr": "fr"}
START, END = "<!-- explore:start -->", "<!-- explore:end -->"

# slug: (list, place for the directions link, official website)
SPOTS = {
    "gardens-by-the-bay": ("sights", "Gardens by the Bay, Singapore", "https://www.gardensbythebay.com.sg/"),
    "merlion-park": ("sights", "Merlion Park, Singapore", "https://www.visitsingapore.com/see-do-singapore/recreation-leisure/viewpoints/merlion-park/"),
    "marina-bay-sands-skypark": ("sights", "Sands SkyPark Observation Deck, Singapore", "https://www.marinabaysands.com/attractions/skypark-observation-deck.html"),
    "sentosa": ("sights", "VivoCity, Singapore", "https://www.sentosa.com.sg/"),
    "mandai": ("sights", "Singapore Zoo, Singapore", "https://www.mandai.com/"),
    "singapore-flyer": ("sights", "Singapore Flyer, Singapore", "https://www.singaporeflyer.com/"),
    "singapore-botanic-gardens": ("nature", "Singapore Botanic Gardens, Singapore", "https://www.nparks.gov.sg/sbg"),
    "macritchie-treetop-walk": ("nature", "Windsor Nature Park, Singapore", NPARKS + "visit/parks/central-catchment-nature-reserve/activities/hiking-nature-walk"),
    "southern-ridges": ("nature", "Mount Faber Park, Singapore", NPARKS + "visit/parks/mount-faber-park"),
    "bukit-timah-nature-reserve": ("nature", "Bukit Timah Nature Reserve, Singapore", NPARKS + "visit/parks/bukit-timah-nature-reserve"),
    "sungei-buloh-wetland-reserve": ("nature", "Sungei Buloh Wetland Reserve, Singapore", NPARKS + "visit/parks/sungei-buloh-wetland-reserve"),
    "pulau-ubin": ("nature", "Changi Point Ferry Terminal, Singapore", "https://pulau-ubin.nparks.gov.sg/visitubin/"),
    "east-coast-park": ("nature", "East Coast Park, Singapore", NPARKS + "visit/parks/east-coast-park"),
    "lucky-plaza-food-court": ("food", "Lucky Plaza, 304 Orchard Rd, Singapore", None),
    "newton-food-centre": ("food", "Newton Food Centre, Singapore", None),
    "maxwell-food-centre": ("food", "Maxwell Food Centre, Singapore", None),
    "lau-pa-sat": ("food", "Lau Pa Sat, Singapore", "https://www.laupasat.sg/"),
    "tiong-bahru-market": ("food", "Tiong Bahru Market, Singapore", None),
    "old-airport-road-food-centre": ("food", "Old Airport Road Food Centre, 51 Old Airport Rd, Singapore", None),
    "kaya-toast": ("food", "Ya Kun Kaya Toast, Paragon, 290 Orchard Rd, Singapore", None),
    "national-gallery-singapore": ("culture", "National Gallery Singapore, Singapore", "https://www.nationalgallery.sg/"),
    "asian-civilisations-museum": ("culture", "Asian Civilisations Museum, Singapore", "https://www.nhb.gov.sg/acm"),
    "peranakan-museum": ("culture", "Peranakan Museum, Singapore", "https://www.nhb.gov.sg/peranakanmuseum"),
    "national-museum-of-singapore": ("culture", "National Museum of Singapore, Singapore", "https://www.nhb.gov.sg/nationalmuseum"),
    "chinatown": ("culture", "Buddha Tooth Relic Temple, Singapore", None),
    "little-india": ("culture", "Tekka Centre, Singapore", None),
    "kampong-glam": ("culture", "Sultan Mosque, Singapore", None),
    "haw-par-villa": ("culture", "Haw Par Villa, Singapore", "https://www.hawparvilla.sg/"),
    "orchard-road": ("shopping", "ION Orchard, Singapore", "https://www.orchardroad.org/"),
    "haji-lane": ("shopping", "Haji Lane, Singapore", None),
    "mustafa-centre": ("shopping", "Mustafa Centre, Singapore", "https://www.mustafa.com.sg/"),
    "bugis-street": ("shopping", "Bugis Street, Singapore", None),
    "jewel-changi-airport": ("shopping", "Jewel Changi Airport, Singapore", "https://www.jewelchangiairport.com/"),
    "emerald-hill": ("night", "Emerald Hill Road, Singapore", None),
    "spectra": ("night", "The Shoppes at Marina Bay Sands, Singapore", "https://www.marinabaysands.com/attractions/spectra.html"),
    "garden-rhapsody": ("night", "Supertree Grove, Singapore", GBTB + "whats-on/calendar-of-events/garden-rhapsody.html"),
    "clarke-quay-robertson-quay": ("night", "Clarke Quay, Singapore", None),
    "keong-saik-ann-siang": ("night", "Keong Saik Road, Singapore", None),
    "rooftop-bars": ("night", "Marina Bay, Singapore", None),
    "batam": ("away", "HarbourFront Centre, Singapore", None),
    "bintan": ("away", "Tanah Merah Ferry Terminal, Singapore", None),
    "malacca": ("away", "Melaka, Malaysia", None),
    "regional-flights": ("away", "Changi Airport, Singapore", None),
}
# What each page's facts were checked against (November 2026). Spots reached by
# MRT also get the LTA map. Walking times are from Google Maps.
SOURCES = {
    "gardens-by-the-bay": [("Gardens by the Bay: Cloud Forest", GBTB + "things-to-do/attractions/cloud-forest.html"), ("Flower Dome", GBTB + "things-to-do/attractions/flower-dome.html"), ("Supertree Grove", GBTB + "things-to-do/attractions/supertree-grove.html")],
    "merlion-park": [("Visit Singapore", VISIT + "see-do-singapore/recreation-leisure/viewpoints/merlion-park/"), ("Wikipedia", WIKI + "Merlion_Park")],
    "marina-bay-sands-skypark": [("Marina Bay Sands", "https://www.marinabaysands.com/attractions/skypark-observation-deck.html"), ("Wikipedia", WIKI + "Marina_Bay_Sands")],
    "sentosa": [("Sentosa: getting here", "https://www.sentosa.com.sg/en/getting-to-sentosa/"), ("Wikipedia", WIKI + "Sentosa")],
    "mandai": [("Mandai: getting here", "https://www.mandai.com/en/plan-your-visit/getting-to-and-around/getting-to-mandai-wildlife-reserve.html"), ("Night Safari", "https://www.mandai.com/en/night-safari.html")],
    "singapore-flyer": [("Visit Singapore", VISIT + "see-do-singapore/recreation-leisure/viewpoints/singapore-flyer/"), ("Wikipedia", WIKI + "Singapore_Flyer")],
    "singapore-botanic-gardens": [("NParks", NPARKS + "sbg"), ("Wikipedia", WIKI + "Singapore_Botanic_Gardens")],
    "macritchie-treetop-walk": [("NParks", NPARKS + "visit/parks/central-catchment-nature-reserve/activities/hiking-nature-walk"), ("Wikipedia", WIKI + "MacRitchie_Reservoir")],
    "southern-ridges": [("NParks: Mount Faber", NPARKS + "visit/parks/mount-faber-park"), ("Wikipedia: Southern Ridges", WIKI + "The_Southern_Ridges"), ("Wikipedia: Henderson Waves", WIKI + "Henderson_Waves")],
    "bukit-timah-nature-reserve": [("NParks", NPARKS + "visit/parks/bukit-timah-nature-reserve"), ("Wikipedia", WIKI + "Bukit_Timah_Nature_Reserve")],
    "sungei-buloh-wetland-reserve": [("NParks", NPARKS + "visit/parks/sungei-buloh-wetland-reserve"), ("Wikipedia", WIKI + "Sungei_Buloh_Wetland_Reserve")],
    "pulau-ubin": [("NParks: Visit Ubin", "https://pulau-ubin.nparks.gov.sg/visitubin/"), ("Wikipedia", WIKI + "Pulau_Ubin"), ("Homejourney guide", "https://www.homejourney.sg/blog/pulau-ubin-day-trip-guide-tickets-prices-opening-hours-homejourney")],
    "east-coast-park": [("NParks", NPARKS + "visit/parks/east-coast-park"), ("Wikipedia", WIKI + "East_Coast_Park")],
    "lucky-plaza-food-court": [("Mothership", "https://mothership.sg/2024/05/lucky-plaza-food-court-kimly"), ("Eatbook", "https://eatbook.sg/lucky-plaza/"), ("TheSmartLocal", "https://thesmartlocal.com/read/lucky-plaza-guide/")],
    "newton-food-centre": [("Wikipedia", WIKI + "Newton_Food_Centre"), ("Eatbook", "https://eatbook.sg/newton-food-centre/")],
    "maxwell-food-centre": [("Wikipedia", WIKI + "Maxwell_Food_Centre"), ("Eatbook", "https://eatbook.sg/maxwell-food/"), ("City Nomads", "https://citynomads.com/maxwell-food-centre-hawker-guide-stalls-you-need-to-try-while-theyre-still-around/")],
    "lau-pa-sat": [("Lau Pa Sat", "https://www.laupasat.sg/"), ("Wikipedia", WIKI + "Lau_Pa_Sat")],
    "tiong-bahru-market": [("Wikipedia", WIKI + "Tiong_Bahru")],
    "old-airport-road-food-centre": [("Roots (National Heritage Board)", "https://www.roots.gov.sg/stories-landing/stories/hawker-centres/blk-51-old-airport-road"), ("Eatbook", "https://eatbook.sg/old-airport-road-food/")],
    "kaya-toast": [("Wikipedia", WIKI + "Kaya_toast"), ("Visit Singapore: order kopi", VISIT + "editorials/order-kopi-like-a-local/"), ("Toast Box at Paragon", "https://paragon.com.sg/store-detail/toast-box"), ("Ya Kun at Paragon", "https://burpple.com/ya-kun-kaya-toast-paragon")],
    "national-gallery-singapore": [("National Gallery Singapore", "https://www.nationalgallery.sg/"), ("Wikipedia", WIKI + "National_Gallery_Singapore")],
    "asian-civilisations-museum": [("Wikipedia: the museum", WIKI + "Asian_Civilisations_Museum"), ("Wikipedia: Tang Shipwreck", WIKI + "Belitung_shipwreck"), ("Wikipedia: Cavenagh Bridge", WIKI + "Cavenagh_Bridge")],
    "peranakan-museum": [("Wikipedia: the museum", WIKI + "Peranakan_Museum"), ("Wikipedia: the building", WIKI + "Old_Tao_Nan_School")],
    "national-museum-of-singapore": [("Wikipedia", WIKI + "National_Museum_of_Singapore")],
    "chinatown": [("Wikipedia: Chinatown", WIKI + "Chinatown,_Singapore"), ("Sri Mariamman Temple", WIKI + "Sri_Mariamman_Temple,_Singapore"), ("Thian Hock Keng", WIKI + "Thian_Hock_Keng"), ("Buddha Tooth Relic Temple", WIKI + "Buddha_Tooth_Relic_Temple_and_Museum")],
    "little-india": [("Wikipedia: Little India", WIKI + "Little_India,_Singapore"), ("Tekka Centre", WIKI + "Tekka_Centre"), ("Sri Veeramakaliamman Temple", WIKI + "Sri_Veeramakaliamman_Temple")],
    "kampong-glam": [("Wikipedia: Kampong Glam", WIKI + "Kampong_Glam"), ("Sultan Mosque", WIKI + "Sultan_Mosque,_Singapore"), ("Sultan Mosque's website", "https://sultanmosque.sg/")],
    "haw-par-villa": [("Haw Par Villa", "https://www.hawparvilla.sg/"), ("Singapore Tourism Board", "https://www.stb.gov.sg/about-stb/media-publications/media-centre/haw-par-villa-to-partially-close-temporarily-for-maintenance-works-/"), ("Wikipedia", WIKI + "Haw_Par_Villa")],
    "orchard-road": [("Orchard Road Business Association", "https://www.orchardroad.org/"), ("Wikipedia", WIKI + "Orchard_Road")],
    "haji-lane": [("Wikipedia", WIKI + "Haji_Lane")],
    "mustafa-centre": [("Mustafa Centre", "https://www.mustafa.com.sg/"), ("Wikipedia", WIKI + "Mustafa_Centre")],
    "bugis-street": [("Wikipedia", WIKI + "Bugis_Street")],
    "jewel-changi-airport": [("Jewel: Rain Vortex", "https://www.jewelchangiairport.com/en/attractions/rain-vortex.html"), ("Wikipedia", WIKI + "Jewel_Changi_Airport")],
    "emerald-hill": [("Wikipedia", WIKI + "Emerald_Hill,_Singapore")],
    "spectra": [("Marina Bay Sands", "https://www.marinabaysands.com/attractions/spectra.html")],
    "garden-rhapsody": [("Gardens by the Bay", GBTB + "whats-on/calendar-of-events/garden-rhapsody.html")],
    "clarke-quay-robertson-quay": [("Wikipedia: Clarke Quay", WIKI + "Clarke_Quay"), ("Robertson Quay", WIKI + "Robertson_Quay")],
    "keong-saik-ann-siang": [("Wikipedia: Keong Saik Road", WIKI + "Keong_Saik_Road"), ("Ann Siang Hill", WIKI + "Ann_Siang_Hill")],
    "rooftop-bars": [],
    "batam": [("Little Big Red Dot guide", LBRD + "batam-weekend-getaway-singapore-2026/"), ("Instarem ferry guide", "https://www.instarem.com/blog/singapore-to-batam-ferry-guide-ticket-price-schedule/"), ("Wikipedia", WIKI + "Batam")],
    "bintan": [("Direct Ferries", "https://www.directferries.com/tanah_merah_bandar_bentan_telani_ferry.htm"), ("Wikipedia", WIKI + "Bintan_Island")],
    "malacca": [("Wikipedia: Malacca", WIKI + "Malacca_City"), ("Chicken rice balls", WIKI + "Hainanese_chicken_rice"), ("Little Big Red Dot guide", LBRD + "malacca-weekend-getaway-singapore-2026/")],
    "regional-flights": [("Flight times to Bangkok", "https://www.flightroutes.com/SIN-BKK"), ("to Phuket", "https://www.flightsfrom.com/SIN-HKT"), ("to Bali", "https://www.flightroutes.com/SIN-DPS")],
}
# The Orchard Road walk is the site's own 5-minute figure (the owner's choice,
# November 2026; Google Maps gives 6 to 8), so that page's note leaves out Google Maps.
CHECK_NO_MAPS = {
    "en": "Checked against the sources below in November 2026. Opening hours, prices and routes change, so please check before you go.",
    "zh": "已于 2026 年 11 月对照下列资料核实。开放时间、价格和路线可能变动，请在出发前确认。",
    "ja": "2026 年 11 月に下記の出典と照合しました。営業時間、料金、経路は変わることがあるので、お出かけ前にご確認ください。",
    "es": "Comprobado con las fuentes siguientes en noviembre de 2026. Los horarios, los precios y las rutas cambian: compruébelos antes de ir.",
    "fr": "Vérifié d’après les sources ci-dessous en novembre 2026. Horaires, prix et itinéraires changent : vérifiez avant de partir.",
}
CHOPE_URL = "https://chinatown.sg/article/foodie-culture/"
# Shown on every food page, and as a link in the Foodie list on the Area page.
CHOPE = {
    "en": ("Good to know: at busy food courts and hawker centres, people often reserve (“chope”) a table by leaving something on it, such as a tissue packet, a card or a water bottle. Keep anything valuable with you.", "Read about chope culture →", "How “choping” a table works"),
    "zh": ("小提示：在拥挤的美食广场和小贩中心，人们常把纸巾包、卡片或水瓶放在桌上来“占位”（chope）。贵重物品请随身携带。", "了解占位文化（英文）→", "如何“占位”（chope）"),
    "ja": ("豆知識：混雑したフードコートやホーカーセンターでは、ティッシュ、カード、水のボトルなどをテーブルに置いて席を取る「チョープ」という習慣があります。貴重品は身につけておきましょう。", "チョープの文化について（英語）→", "席取り文化「チョープ」"),
    "es": ("Conviene saber: en los centros de comida concurridos, la gente suele reservar (“chope”) una mesa dejando algo encima, como un paquete de pañuelos, una tarjeta o una botella de agua. Lleve consigo los objetos de valor.", "Más sobre la cultura del chope (en inglés) →", "Cómo reservar mesa con “chope”"),
    "fr": ("Bon à savoir : dans les centres de restauration très fréquentés, on réserve souvent (« chope ») une table en y laissant un objet, comme un paquet de mouchoirs, une carte ou une bouteille d’eau. Gardez vos objets de valeur sur vous.", "En savoir plus sur le « chope » (en anglais) →", "Réserver une table avec le « chope »"),
}
LISTS = ["sights", "nature", "food", "culture", "shopping", "night", "away"]

UI = {
    "en": {
        "lists": {
            "sights": ("Sights", "Attraction junkie"), "nature": ("Outdoors", "Nature lover"),
            "food": ("Food", "Foodie"), "culture": ("Culture", "Culture and history buff"),
            "shopping": ("Shopping", "Shopper"), "night": ("After dark", "Night owl"),
            "away": ("Away", "Weekend escaper"),
        },
        "title": "Explore Singapore", "h2": "Out and <em>about.</em>",
        "lede": "Whatever you’re into, here’s where to spend your days off. Tap any spot for a short guide and directions from the house.",
        "note_eyebrow": "Good to know", "note_h3": "Before you go",
        "notes": ["Routes start at Orchard MRT, a 10-minute walk from the house",
                  "Opening hours, prices and routes change, so check before you go",
                  "For trips abroad, bring your passport and make sure your Singapore pass is valid for your return"],
        "get": "Getting there", "dirs": "Directions from the house →", "site": "Official website →",
        "more": "More in this list", "back": "← Back to the area guide",
        "check": "Checked against the sources below in November 2026, with walking times from Google Maps. Opening hours, prices and routes change, so please check before you go.",
        "sources": "Sources",
    },
    "zh": {
        "lists": {
            "sights": ("景点", "景点控"), "nature": ("户外", "自然爱好者"),
            "food": ("美食", "美食家"), "culture": ("文化", "文化历史迷"),
            "shopping": ("购物", "购物达人"), "night": ("入夜", "夜猫子"),
            "away": ("出游", "周末出走族"),
        },
        "title": "探索新加坡", "h2": "出门<em>走走。</em>",
        "lede": "无论您喜欢什么，这里都有适合您休息日的去处。点击任一地点，查看简短介绍和从住处出发的路线。",
        "note_eyebrow": "温馨提示", "note_h3": "出发之前",
        "notes": ["路线从乌节地铁站出发，从住处步行 10 分钟即到",
                  "开放时间、价格和路线可能变动，请在出发前确认",
                  "出国旅行请携带护照，并确认新加坡准证在返回时仍然有效"],
        "get": "如何前往", "dirs": "从住处出发的路线 →", "site": "官方网站 →",
        "more": "同类推荐", "back": "← 返回周边环境",
        "check": "已于 2026 年 11 月对照下列资料核实，步行时间来自 Google 地图。开放时间、价格和路线可能变动，请在出发前确认。",
        "sources": "资料来源",
    },
    "ja": {
        "lists": {
            "sights": ("観光", "観光スポット好き"), "nature": ("アウトドア", "自然好き"),
            "food": ("グルメ", "食べ歩き好き"), "culture": ("文化", "文化・歴史好き"),
            "shopping": ("ショッピング", "買い物好き"), "night": ("夜", "夜遊び派"),
            "away": ("小旅行", "週末旅行派"),
        },
        "title": "シンガポールを巡る", "h2": "街へ<em>出かけよう。</em>",
        "lede": "お好みに合わせて、休日の過ごし方をご紹介します。各スポットをタップすると、短いガイドと家からの経路をご覧いただけます。",
        "note_eyebrow": "ご参考に", "note_h3": "お出かけの前に",
        "notes": ["経路は、家から徒歩 10 分のオーチャード駅を起点にしています",
                  "営業時間、料金、経路は変わることがあるので、お出かけ前にご確認ください",
                  "海外へ行くときはパスポートを持参し、シンガポールのパスが帰国時に有効であることをご確認ください"],
        "get": "アクセス", "dirs": "家からの経路 →", "site": "公式サイト →",
        "more": "同じリストのスポット", "back": "← 周辺エリアに戻る",
        "check": "2026 年 11 月に下記の出典と照合しました。徒歩時間は Google マップによるものです。営業時間、料金、経路は変わることがあるので、お出かけ前にご確認ください。",
        "sources": "出典",
    },
    "es": {
        "lists": {
            "sights": ("Lugares", "Amante de las atracciones"), "nature": ("Aire libre", "Amante de la naturaleza"),
            "food": ("Comida", "Sibarita"), "culture": ("Cultura", "Apasionado de la cultura y la historia"),
            "shopping": ("Compras", "Comprador"), "night": ("De noche", "Noctámbulo"),
            "away": ("Escapadas", "Viajero de fin de semana"),
        },
        "title": "Explorar Singapur", "h2": "A la <em>calle.</em>",
        "lede": "Le guste lo que le guste, aquí tiene dónde pasar sus días libres. Toque cualquier lugar para ver una breve guía y las indicaciones desde la casa.",
        "note_eyebrow": "Conviene saber", "note_h3": "Antes de ir",
        "notes": ["Las rutas parten de la estación de Orchard, a 10 minutos a pie de la casa",
                  "Los horarios, los precios y las rutas cambian: compruébelos antes de ir",
                  "Para viajes al extranjero, lleve el pasaporte y asegúrese de que su pase de Singapur sea válido para el regreso"],
        "get": "Cómo llegar", "dirs": "Indicaciones desde la casa →", "site": "Web oficial →",
        "more": "Más en esta lista", "back": "← Volver a la guía de la zona",
        "check": "Comprobado con las fuentes siguientes en noviembre de 2026; los tiempos a pie son de Google Maps. Los horarios, los precios y las rutas cambian: compruébelos antes de ir.",
        "sources": "Fuentes",
    },
    "fr": {
        "lists": {
            "sights": ("À voir", "Fan d’attractions"), "nature": ("Plein air", "Amoureux de la nature"),
            "food": ("Cuisine", "Gourmet"), "culture": ("Culture", "Passionné de culture et d’histoire"),
            "shopping": ("Shopping", "Accro au shopping"), "night": ("La nuit", "Oiseau de nuit"),
            "away": ("Évasion", "Adepte des week-ends"),
        },
        "title": "Découvrir Singapour", "h2": "Sortir et <em>explorer.</em>",
        "lede": "Quels que soient vos goûts, voici où passer vos jours de repos. Touchez un lieu pour lire un court guide et voir l’itinéraire depuis la maison.",
        "note_eyebrow": "Bon à savoir", "note_h3": "Avant de partir",
        "notes": ["Les itinéraires partent de la station Orchard, à 10 minutes à pied de la maison",
                  "Horaires, prix et itinéraires changent : vérifiez avant de partir",
                  "Pour les voyages à l’étranger, emportez votre passeport et vérifiez que votre titre de séjour singapourien sera valable au retour"],
        "get": "Comment y aller", "dirs": "Itinéraire depuis la maison →", "site": "Site officiel →",
        "more": "Dans la même liste", "back": "← Retour au guide du quartier",
        "check": "Vérifié d’après les sources ci-dessous en novembre 2026, avec les temps de marche de Google Maps. Horaires, prix et itinéraires changent : vérifiez avant de partir.",
        "sources": "Sources",
    },
}


def load(lang):
    """Parse tools/explore/<lang>.txt into {slug: {name, lede, body: [...], get}}."""
    spots, cur = {}, None
    for line in (ROOT / "tools/explore" / f"{lang}.txt").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        if line.startswith("@"):
            cur = spots.setdefault(line[1:].strip(), {"body": []})
            continue
        key, value = line.split(": ", 1)
        value = html.escape(value, quote=False).replace("'", "’")
        if key == "body":
            cur["body"].append(value)
        else:
            cur[key] = value
    assert list(spots) == list(SPOTS), f"{lang}: spots don't match SPOTS"
    for slug, spot in spots.items():
        assert {"name", "lede", "get"} <= spot.keys() and spot["body"], f"{lang}/{slug}: incomplete"
    return spots


def lang_dir(lang):
    return ROOT if lang == "en" else ROOT / lang


def page_url(lang, path):
    return SITE + ("" if lang == "en" else lang + "/") + path


def one_level_down(fragment):
    """Point the relative links of a piece of area.html at the same files from explore/."""
    return re.sub(r'\b(href|src)="(?!https?:|#|mailto:|tel:)', r'\1="../', fragment)


def spot_page(lang, slug, spot, spots, head, cta, footer, en_get):
    ui = UI[lang]
    group, place, website = SPOTS[slug]
    eyebrow, persona = ui["lists"][group]
    path = f"explore/{slug}.html"
    title = f"{spot['name']} | {ui['title']} | 22 Jalan Elok"
    desc = html.escape(html.unescape(spot["lede"]))

    head = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", head)
    head = re.sub(r'(<meta name="description" content=")[^"]*', lambda m: m.group(1) + desc, head)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m.group(1) + title, head)
    head = re.sub(r'(<meta property="og:description" content=")[^"]*', lambda m: m.group(1) + desc, head)
    head = re.sub(r"https://22je\.sg/((?:zh/|ja/|es/|fr/)?)area\.html", lambda m: f"{SITE}{m.group(1)}{path}", head)

    links = [f'<a class="link-arrow" href="https://www.google.com/maps/dir/{HOUSE}/{quote_plus(place)}" target="_blank" rel="noopener">{ui["dirs"]}</a>']
    if website:
        links.append(f'<a class="link-arrow" href="{website}" target="_blank" rel="noopener">{ui["site"]}</a>')
    others = "\n".join(
        f'          <li><a href="{other}.html">{spots[other]["name"]}</a></li>'
        for other, info in SPOTS.items() if info[0] == group and other != slug
    )
    body = "\n".join(f"        <p>{p}</p>" for p in spot["body"])
    if group == "food":
        note, link, _ = CHOPE[lang]
        body += f'\n        <p>{note} <a href="{CHOPE_URL}" target="_blank" rel="noopener">{link}</a></p>'
    refs = SOURCES[slug] + ([LTA_MAP] if " Line " in en_get else [])
    sources = ""
    if refs:
        ref_links = " · ".join(f'<a href="{url}" target="_blank" rel="noopener">{html.escape(label, quote=False)}</a>' for label, url in refs)
        sources = f'        <p style="font-size:0.85rem;color:var(--muted)">{ui["sources"]}: {ref_links}</p>'

    return f"""{head}
<body>
  <div data-header></div>

  <main>
    <header class="page-head">
      <div class="wrap reveal">
        <span class="eyebrow">{eyebrow}</span>
        <h1>{spot['name']}</h1>
        <p class="lede">{spot['lede']}</p>
      </div>
    </header>

    <section class="section" style="padding-top:0">
      <div class="wrap reveal" style="max-width:760px">
{body}
        <ul class="specs" style="grid-template-columns:1fr;margin-top:28px">
          <li><span>{ui['get']}</span>{spot['get']}</li>
        </ul>
        <div class="btn-row" style="gap:24px">
          {'''
          '''.join(links)}
        </div>
        <p style="margin-top:28px;font-size:0.85rem;color:var(--muted)">{CHECK_NO_MAPS[lang] if slug == "orchard-road" else ui['check']}</p>
{sources}
      </div>
    </section>

    <section class="section section--cream">
      <div class="wrap reveal" style="max-width:760px">
        <span class="eyebrow">{ui['more']}</span>
        <h2>{persona}</h2>
        <ul class="ticks">
{others}
        </ul>
        <p style="margin-top:28px"><a class="link-arrow" href="../area.html#explore">{ui['back']}</a></p>
      </div>
    </section>

{cta}
  </main>

{footer}
"""


def area_section(lang, spots):
    ui = UI[lang]
    cols = []
    for group in LISTS:
        eyebrow, persona = ui["lists"][group]
        items = "\n".join(
            f'              <li><a href="explore/{slug}.html">{spots[slug]["name"]}</a></li>'
            for slug, info in SPOTS.items() if info[0] == group
        )
        if group == "food":
            items += f'\n              <li><a href="{CHOPE_URL}" target="_blank" rel="noopener">{CHOPE[lang][2]}</a></li>'
        cols.append(f"""          <div class="feature-col">
            <span class="eyebrow">{eyebrow}</span>
            <h3>{persona}</h3>
            <ul class="ticks">
{items}
            </ul>
          </div>""")
    notes = "\n".join(f"              <li>{n}</li>" for n in ui["notes"])
    cols.append(f"""          <div class="feature-col">
            <span class="eyebrow">{ui['note_eyebrow']}</span>
            <h3>{ui['note_h3']}</h3>
            <ul class="ticks">
{notes}
            </ul>
          </div>""")
    grid = "\n".join(cols)
    return f"""{START}
    <section class="section" id="explore">
      <div class="wrap">
        <div class="center reveal" style="margin-bottom:40px">
          <span class="eyebrow">{ui['title']}</span>
          <h2>{ui['h2']}</h2>
          <p class="lede">{ui['lede']}</p>
        </div>
        <div class="feature-grid feature-grid--4 reveal">
{grid}
        </div>
      </div>
    </section>
    {END}

"""


def build_lang(lang):
    spots = load(lang)
    assert set(SOURCES) == set(SPOTS)
    area_path = lang_dir(lang) / "area.html"
    area = area_path.read_text(encoding="utf-8")

    # Put the section in (or refresh it) just before the closing "Make it home" section.
    area = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\s*", "", area, flags=re.S)
    cta_start = area.rindex('<section class="section">', 0, area.index("</main>"))
    area = area[:cta_start] + area_section(lang, spots) + "    " + area[cta_start:]
    area_path.write_text(area, encoding="utf-8")

    head = one_level_down(area[: area.index("<body>")].rstrip())
    cta_html = area[area.rindex('<section class="section">', 0, area.index("</main>")): area.index("</main>")].rstrip()
    cta = "    " + one_level_down(cta_html)
    footer = one_level_down(area[area.index("<div data-footer>"):]).replace("<div data-footer>", "  <div data-footer>", 1).rstrip()

    out = lang_dir(lang) / "explore"
    out.mkdir(exist_ok=True)
    for old in out.glob("*.html"):
        old.unlink()
    for slug, spot in spots.items():
        (out / f"{slug}.html").write_text(spot_page(lang, slug, spot, spots, head, cta, footer, EN_GET[slug]), encoding="utf-8")


def build_sitemap():
    path = ROOT / "sitemap.xml"
    xml = re.sub(r"\s*<url><loc>[^<]*/explore/[^<]*</loc>.*?</url>", "", path.read_text(encoding="utf-8"))
    today = datetime.date.today().isoformat()
    xml = re.sub(r"(/area\.html</loc><lastmod>)[^<]*", rf"\g<1>{today}", xml)
    entries = "".join(
        f"  <url><loc>{page_url(lang, f'explore/{slug}.html')}</loc><lastmod>{today}</lastmod></url>\n"
        for lang in UI for slug in SPOTS
    )
    path.write_text(xml.replace("</urlset>", entries + "</urlset>"), encoding="utf-8")


if __name__ == "__main__":
    EN_GET = {slug: spot["get"] for slug, spot in load("en").items()}
    for lang in UI:
        build_lang(lang)
    build_sitemap()
    print(f"Built {len(SPOTS)} spots in {len(UI)} languages: {len(SPOTS) * len(UI)} pages")
