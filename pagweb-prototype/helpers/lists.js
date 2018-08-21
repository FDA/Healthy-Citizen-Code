// Data Types
// TODO: instead of enum use list in the schema definition, process definition before feeding to mongoose
// Alerts/enforcements reference: https://open.fda.gov/drug/enforcement/reference/
// Adverse events: https://open.fda.gov/device/event/reference/


module.exports = function () {
    var _ = require('lodash');

    var m = {
        countriesListRaw: [
            {
                "name": "Afghanistan",
                "code": "AF"
            },
            {
                "name": "�land Islands",
                "code": "AX"
            },
            {
                "name": "Albania",
                "code": "AL"
            },
            {
                "name": "Algeria",
                "code": "DZ"
            },
            {
                "name": "American Samoa",
                "code": "AS"
            },
            {
                "name": "Andorra",
                "code": "AD"
            },
            {
                "name": "Angola",
                "code": "AO"
            },
            {
                "name": "Anguilla",
                "code": "AI"
            },
            {
                "name": "Antarctica",
                "code": "AQ"
            },
            {
                "name": "Antigua and Barbuda",
                "code": "AG"
            },
            {
                "name": "Argentina",
                "code": "AR"
            },
            {
                "name": "Armenia",
                "code": "AM"
            },
            {
                "name": "Aruba",
                "code": "AW"
            },
            {
                "name": "Australia",
                "code": "AU"
            },
            {
                "name": "Austria",
                "code": "AT"
            },
            {
                "name": "Azerbaijan",
                "code": "AZ"
            },
            {
                "name": "Bahamas",
                "code": "BS"
            },
            {
                "name": "Bahrain",
                "code": "BH"
            },
            {
                "name": "Bangladesh",
                "code": "BD"
            },
            {
                "name": "Barbados",
                "code": "BB"
            },
            {
                "name": "Belarus",
                "code": "BY"
            },
            {
                "name": "Belgium",
                "code": "BE"
            },
            {
                "name": "Belize",
                "code": "BZ"
            },
            {
                "name": "Benin",
                "code": "BJ"
            },
            {
                "name": "Bermuda",
                "code": "BM"
            },
            {
                "name": "Bhutan",
                "code": "BT"
            },
            {
                "name": "Bolivia, Plurinational State of",
                "code": "BO"
            },
            {
                "name": "Bonaire, Sint Eustatius and Saba",
                "code": "BQ"
            },
            {
                "name": "Bosnia and Herzegovina",
                "code": "BA"
            },
            {
                "name": "Botswana",
                "code": "BW"
            },
            {
                "name": "Bouvet Island",
                "code": "BV"
            },
            {
                "name": "Brazil",
                "code": "BR"
            },
            {
                "name": "British Indian Ocean Territory",
                "code": "IO"
            },
            {
                "name": "Brunei Darussalam",
                "code": "BN"
            },
            {
                "name": "Bulgaria",
                "code": "BG"
            },
            {
                "name": "Burkina Faso",
                "code": "BF"
            },
            {
                "name": "Burundi",
                "code": "BI"
            },
            {
                "name": "Cambodia",
                "code": "KH"
            },
            {
                "name": "Cameroon",
                "code": "CM"
            },
            {
                "name": "Canada",
                "code": "CA"
            },
            {
                "name": "Cape Verde",
                "code": "CV"
            },
            {
                "name": "Cayman Islands",
                "code": "KY"
            },
            {
                "name": "Central African Republic",
                "code": "CF"
            },
            {
                "name": "Chad",
                "code": "TD"
            },
            {
                "name": "Chile",
                "code": "CL"
            },
            {
                "name": "China",
                "code": "CN"
            },
            {
                "name": "Christmas Island",
                "code": "CX"
            },
            {
                "name": "Cocos (Keeling) Islands",
                "code": "CC"
            },
            {
                "name": "Colombia",
                "code": "CO"
            },
            {
                "name": "Comoros",
                "code": "KM"
            },
            {
                "name": "Congo",
                "code": "CG"
            },
            {
                "name": "Congo, the Democratic Republic of the",
                "code": "CD"
            },
            {
                "name": "Cook Islands",
                "code": "CK"
            },
            {
                "name": "Costa Rica",
                "code": "CR"
            },
            {
                "name": "C�te d'Ivoire",
                "code": "CI"
            },
            {
                "name": "Croatia",
                "code": "HR"
            },
            {
                "name": "Cuba",
                "code": "CU"
            },
            {
                "name": "Cura�ao",
                "code": "CW"
            },
            {
                "name": "Cyprus",
                "code": "CY"
            },
            {
                "name": "Czech Republic",
                "code": "CZ"
            },
            {
                "name": "Denmark",
                "code": "DK"
            },
            {
                "name": "Djibouti",
                "code": "DJ"
            },
            {
                "name": "Dominica",
                "code": "DM"
            },
            {
                "name": "Dominican Republic",
                "code": "DO"
            },
            {
                "name": "Ecuador",
                "code": "EC"
            },
            {
                "name": "Egypt",
                "code": "EG"
            },
            {
                "name": "El Salvador",
                "code": "SV"
            },
            {
                "name": "Equatorial Guinea",
                "code": "GQ"
            },
            {
                "name": "Eritrea",
                "code": "ER"
            },
            {
                "name": "Estonia",
                "code": "EE"
            },
            {
                "name": "Ethiopia",
                "code": "ET"
            },
            {
                "name": "Falkland Islands (Malvinas)",
                "code": "FK"
            },
            {
                "name": "Faroe Islands",
                "code": "FO"
            },
            {
                "name": "Fiji",
                "code": "FJ"
            },
            {
                "name": "Finland",
                "code": "FI"
            },
            {
                "name": "France",
                "code": "FR"
            },
            {
                "name": "French Guiana",
                "code": "GF"
            },
            {
                "name": "French Polynesia",
                "code": "PF"
            },
            {
                "name": "French Southern Territories",
                "code": "TF"
            },
            {
                "name": "Gabon",
                "code": "GA"
            },
            {
                "name": "Gambia",
                "code": "GM"
            },
            {
                "name": "Georgia",
                "code": "GE"
            },
            {
                "name": "Germany",
                "code": "DE"
            },
            {
                "name": "Ghana",
                "code": "GH"
            },
            {
                "name": "Gibraltar",
                "code": "GI"
            },
            {
                "name": "Greece",
                "code": "GR"
            },
            {
                "name": "Greenland",
                "code": "GL"
            },
            {
                "name": "Grenada",
                "code": "GD"
            },
            {
                "name": "Guadeloupe",
                "code": "GP"
            },
            {
                "name": "Guam",
                "code": "GU"
            },
            {
                "name": "Guatemala",
                "code": "GT"
            },
            {
                "name": "Guernsey",
                "code": "GG"
            },
            {
                "name": "Guinea",
                "code": "GN"
            },
            {
                "name": "Guinea-Bissau",
                "code": "GW"
            },
            {
                "name": "Guyana",
                "code": "GY"
            },
            {
                "name": "Haiti",
                "code": "HT"
            },
            {
                "name": "Heard Island and McDonald Islands",
                "code": "HM"
            },
            {
                "name": "Holy See (Vatican City State)",
                "code": "VA"
            },
            {
                "name": "Honduras",
                "code": "HN"
            },
            {
                "name": "Hong Kong",
                "code": "HK"
            },
            {
                "name": "Hungary",
                "code": "HU"
            },
            {
                "name": "Iceland",
                "code": "IS"
            },
            {
                "name": "India",
                "code": "IN"
            },
            {
                "name": "Indonesia",
                "code": "ID"
            },
            {
                "name": "Iran, Islamic Republic of",
                "code": "IR"
            },
            {
                "name": "Iraq",
                "code": "IQ"
            },
            {
                "name": "Ireland",
                "code": "IE"
            },
            {
                "name": "Isle of Man",
                "code": "IM"
            },
            {
                "name": "Israel",
                "code": "IL"
            },
            {
                "name": "Italy",
                "code": "IT"
            },
            {
                "name": "Jamaica",
                "code": "JM"
            },
            {
                "name": "Japan",
                "code": "JP"
            },
            {
                "name": "Jersey",
                "code": "JE"
            },
            {
                "name": "Jordan",
                "code": "JO"
            },
            {
                "name": "Kazakhstan",
                "code": "KZ"
            },
            {
                "name": "Kenya",
                "code": "KE"
            },
            {
                "name": "Kiribati",
                "code": "KI"
            },
            {
                "name": "Korea, Democratic People's Republic of",
                "code": "KP"
            },
            {
                "name": "Korea, Republic of",
                "code": "KR"
            },
            {
                "name": "Kuwait",
                "code": "KW"
            },
            {
                "name": "Kyrgyzstan",
                "code": "KG"
            },
            {
                "name": "Lao People's Democratic Republic",
                "code": "LA"
            },
            {
                "name": "Latvia",
                "code": "LV"
            },
            {
                "name": "Lebanon",
                "code": "LB"
            },
            {
                "name": "Lesotho",
                "code": "LS"
            },
            {
                "name": "Liberia",
                "code": "LR"
            },
            {
                "name": "Libya",
                "code": "LY"
            },
            {
                "name": "Liechtenstein",
                "code": "LI"
            },
            {
                "name": "Lithuania",
                "code": "LT"
            },
            {
                "name": "Luxembourg",
                "code": "LU"
            },
            {
                "name": "Macao",
                "code": "MO"
            },
            {
                "name": "Macedonia, the Former Yugoslav Republic of",
                "code": "MK"
            },
            {
                "name": "Madagascar",
                "code": "MG"
            },
            {
                "name": "Malawi",
                "code": "MW"
            },
            {
                "name": "Malaysia",
                "code": "MY"
            },
            {
                "name": "Maldives",
                "code": "MV"
            },
            {
                "name": "Mali",
                "code": "ML"
            },
            {
                "name": "Malta",
                "code": "MT"
            },
            {
                "name": "Marshall Islands",
                "code": "MH"
            },
            {
                "name": "Martinique",
                "code": "MQ"
            },
            {
                "name": "Mauritania",
                "code": "MR"
            },
            {
                "name": "Mauritius",
                "code": "MU"
            },
            {
                "name": "Mayotte",
                "code": "YT"
            },
            {
                "name": "Mexico",
                "code": "MX"
            },
            {
                "name": "Micronesia, Federated States of",
                "code": "FM"
            },
            {
                "name": "Moldova, Republic of",
                "code": "MD"
            },
            {
                "name": "Monaco",
                "code": "MC"
            },
            {
                "name": "Mongolia",
                "code": "MN"
            },
            {
                "name": "Montenegro",
                "code": "ME"
            },
            {
                "name": "Montserrat",
                "code": "MS"
            },
            {
                "name": "Morocco",
                "code": "MA"
            },
            {
                "name": "Mozambique",
                "code": "MZ"
            },
            {
                "name": "Myanmar",
                "code": "MM"
            },
            {
                "name": "Namibia",
                "code": "NA"
            },
            {
                "name": "Nauru",
                "code": "NR"
            },
            {
                "name": "Nepal",
                "code": "NP"
            },
            {
                "name": "Netherlands",
                "code": "NL"
            },
            {
                "name": "New Caledonia",
                "code": "NC"
            },
            {
                "name": "New Zealand",
                "code": "NZ"
            },
            {
                "name": "Nicaragua",
                "code": "NI"
            },
            {
                "name": "Niger",
                "code": "NE"
            },
            {
                "name": "Nigeria",
                "code": "NG"
            },
            {
                "name": "Niue",
                "code": "NU"
            },
            {
                "name": "Norfolk Island",
                "code": "NF"
            },
            {
                "name": "Northern Mariana Islands",
                "code": "MP"
            },
            {
                "name": "Norway",
                "code": "NO"
            },
            {
                "name": "Oman",
                "code": "OM"
            },
            {
                "name": "Pakistan",
                "code": "PK"
            },
            {
                "name": "Palau",
                "code": "PW"
            },
            {
                "name": "Palestine, State of",
                "code": "PS"
            },
            {
                "name": "Panama",
                "code": "PA"
            },
            {
                "name": "Papua New Guinea",
                "code": "PG"
            },
            {
                "name": "Paraguay",
                "code": "PY"
            },
            {
                "name": "Peru",
                "code": "PE"
            },
            {
                "name": "Philippines",
                "code": "PH"
            },
            {
                "name": "Pitcairn",
                "code": "PN"
            },
            {
                "name": "Poland",
                "code": "PL"
            },
            {
                "name": "Portugal",
                "code": "PT"
            },
            {
                "name": "Puerto Rico",
                "code": "PR"
            },
            {
                "name": "Qatar",
                "code": "QA"
            },
            {
                "name": "R�union",
                "code": "RE"
            },
            {
                "name": "Romania",
                "code": "RO"
            },
            {
                "name": "Russian Federation",
                "code": "RU"
            },
            {
                "name": "Rwanda",
                "code": "RW"
            },
            {
                "name": "Saint Barth�lemy",
                "code": "BL"
            },
            {
                "name": "Saint Helena, Ascension and Tristan da Cunha",
                "code": "SH"
            },
            {
                "name": "Saint Kitts and Nevis",
                "code": "KN"
            },
            {
                "name": "Saint Lucia",
                "code": "LC"
            },
            {
                "name": "Saint Martin (French part)",
                "code": "MF"
            },
            {
                "name": "Saint Pierre and Miquelon",
                "code": "PM"
            },
            {
                "name": "Saint Vincent and the Grenadines",
                "code": "VC"
            },
            {
                "name": "Samoa",
                "code": "WS"
            },
            {
                "name": "San Marino",
                "code": "SM"
            },
            {
                "name": "Sao Tome and Principe",
                "code": "ST"
            },
            {
                "name": "Saudi Arabia",
                "code": "SA"
            },
            {
                "name": "Senegal",
                "code": "SN"
            },
            {
                "name": "Serbia",
                "code": "RS"
            },
            {
                "name": "Seychelles",
                "code": "SC"
            },
            {
                "name": "Sierra Leone",
                "code": "SL"
            },
            {
                "name": "Singapore",
                "code": "SG"
            },
            {
                "name": "Sint Maarten (Dutch part)",
                "code": "SX"
            },
            {
                "name": "Slovakia",
                "code": "SK"
            },
            {
                "name": "Slovenia",
                "code": "SI"
            },
            {
                "name": "Solomon Islands",
                "code": "SB"
            },
            {
                "name": "Somalia",
                "code": "SO"
            },
            {
                "name": "South Africa",
                "code": "ZA"
            },
            {
                "name": "South Georgia and the South Sandwich Islands",
                "code": "GS"
            },
            {
                "name": "South Sudan",
                "code": "SS"
            },
            {
                "name": "Spain",
                "code": "ES"
            },
            {
                "name": "Sri Lanka",
                "code": "LK"
            },
            {
                "name": "Sudan",
                "code": "SD"
            },
            {
                "name": "Suriname",
                "code": "SR"
            },
            {
                "name": "Svalbard and Jan Mayen",
                "code": "SJ"
            },
            {
                "name": "Swaziland",
                "code": "SZ"
            },
            {
                "name": "Sweden",
                "code": "SE"
            },
            {
                "name": "Switzerland",
                "code": "CH"
            },
            {
                "name": "Syrian Arab Republic",
                "code": "SY"
            },
            {
                "name": "Taiwan, Province of China",
                "code": "TW"
            },
            {
                "name": "Tajikistan",
                "code": "TJ"
            },
            {
                "name": "Tanzania, United Republic of",
                "code": "TZ"
            },
            {
                "name": "Thailand",
                "code": "TH"
            },
            {
                "name": "Timor-Leste",
                "code": "TL"
            },
            {
                "name": "Togo",
                "code": "TG"
            },
            {
                "name": "Tokelau",
                "code": "TK"
            },
            {
                "name": "Tonga",
                "code": "TO"
            },
            {
                "name": "Trinidad and Tobago",
                "code": "TT"
            },
            {
                "name": "Tunisia",
                "code": "TN"
            },
            {
                "name": "Turkey",
                "code": "TR"
            },
            {
                "name": "Turkmenistan",
                "code": "TM"
            },
            {
                "name": "Turks and Caicos Islands",
                "code": "TC"
            },
            {
                "name": "Tuvalu",
                "code": "TV"
            },
            {
                "name": "Uganda",
                "code": "UG"
            },
            {
                "name": "Ukraine",
                "code": "UA"
            },
            {
                "name": "United Arab Emirates",
                "code": "AE"
            },
            {
                "name": "United Kingdom",
                "code": "GB"
            },
            {
                "name": "United States",
                "code": "US"
            },
            {
                "name": "United States Minor Outlying Islands",
                "code": "UM"
            },
            {
                "name": "Uruguay",
                "code": "UY"
            },
            {
                "name": "Uzbekistan",
                "code": "UZ"
            },
            {
                "name": "Vanuatu",
                "code": "VU"
            },
            {
                "name": "Venezuela, Bolivarian Republic of",
                "code": "VE"
            },
            {
                "name": "Viet Nam",
                "code": "VN"
            },
            {
                "name": "Virgin Islands, British",
                "code": "VG"
            },
            {
                "name": "Virgin Islands, U.S.",
                "code": "VI"
            },
            {
                "name": "Wallis and Futuna",
                "code": "WF"
            },
            {
                "name": "Western Sahara",
                "code": "EH"
            },
            {
                "name": "Yemen",
                "code": "YE"
            },
            {
                "name": "Zambia",
                "code": "ZM"
            },
            {
                "name": "Zimbabwe",
                "code": "ZW"
            }
        ],
        encounterDischargeAndAdmittingSources: { // http://www.mini-sentinel.org/work_products/Data_Activities/Sentinel_Common-Data-Model.pdf page 13
            'AF': 'Adult Foster Home',
            'AL': 'Assisted Living Facility',
            'AM': 'Ambulatory Visit',
            'AW': 'Emergency Department',
            'EX': 'Expired',
            'HH': 'Home Health',
            'HO': 'Home / Self Care',
            'HS': 'Hospice',
            'IP': 'Other Acute Inpatient Hospital',
            'NH': 'Nursing Home (Includes ICF)',
            'OT': 'Other',
            'RH': 'Rehabilitation Facility',
            'RS': 'Residential Facility',
            'SH': 'Still In Hospital',
            'SN': 'Skilled Nursing Facility',
            'UN': 'Unknown'
        },
        // TODO: rename variables from lowercase into camecase, sync with fronends
        routesOfAdministration: { // http://www.fda.gov/Drugs/DevelopmentApprovalProcess/FormsSubmissionRequirements/ElectronicSubmissions/DataStandardsManualmonographs/ucm071667.htm
            "1": {
                "name": "ORAL",
                "short_name": "ORAL",
                "nci_concept_id": "C38288",
                "definition": "Administration to or by way of the mouth."
            },
            "2": {
                "name": "INTRAVENOUS",
                "short_name": "IV",
                "nci_concept_id": "C38276",
                "definition": "Administration within or into a vein or veins."
            },
            "3": {
                "name": "SUBCUTANEOUS",
                "short_name": "SC",
                "nci_concept_id": "C38299",
                "definition": "Administration beneath the skin; hypodermic.? Synonymous with the term SUBDERMAL."
            },
            "4": {
                "name": "INTRAPERITONEAL",
                "short_name": "I-PERITON",
                "nci_concept_id": "C38258",
                "definition": "Administration within the peritoneal cavity."
            },
            "5": {
                "name": "INTRAMUSCULAR",
                "short_name": "IM",
                "nci_concept_id": "C28161",
                "definition": "Administration within a muscle."
            },
            "6": {
                "name": "INTRATHORACIC",
                "short_name": "I-THORAC",
                "nci_concept_id": "C38207",
                "definition": "Administration within the thorax (internal to the ribs); synonymous with the term endothoracic."
            },
            "7": {
                "name": "INTRA-ARTICULAR",
                "short_name": "I-ARTIC",
                "nci_concept_id": "C38223",
                "definition": "Administration within a joint."
            },
            "8": {
                "name": "INTRADERMAL",
                "short_name": "I-DERMAL",
                "nci_concept_id": "C38238",
                "definition": "Administration within the dermis."
            },
            "9": {
                "name": "EPIDURAL",
                "short_name": "EPIDUR",
                "nci_concept_id": "C38210",
                "definition": "Administration upon or over the dura mater."
            },
            "10": {
                "name": "INTRASINAL",
                "short_name": "I-SINAL",
                "nci_concept_id": "C38262",
                "definition": "Administration within the nasal or periorbital sinuses."
            },
            "11": {
                "name": "TOPICAL",
                "short_name": "TOPIC",
                "nci_concept_id": "C38304",
                "definition": "Administration to a particular spot on the outer surface of the body.? The E2B term TRANSMAMMARY is a subset of the term TOPICAL."
            },
            "12": {
                "name": "OPHTHALMIC",
                "short_name": "OPHTHALM",
                "nci_concept_id": "C38287",
                "definition": "Administration? to the external eye."
            },
            "13": {
                "name": "AURICULAR (OTIC)",
                "short_name": "OTIC",
                "nci_concept_id": "C38192",
                "definition": "Administration to or by way of the ear."
            },
            "14": {
                "name": "NASAL",
                "short_name": "NASAL",
                "nci_concept_id": "C38284",
                "definition": "Administration to the nose; administered by way of the nose."
            },
            "15": {
                "name": "VAGINAL",
                "short_name": "VAGIN",
                "nci_concept_id": "C38313",
                "definition": "Administration into the vagina."
            },
            "16": {
                "name": "RECTAL",
                "short_name": "RECTAL",
                "nci_concept_id": "C38295",
                "definition": "Administration to the rectum."
            },
            "17": {
                "name": "URETHRAL",
                "short_name": "URETH",
                "nci_concept_id": "C38271",
                "definition": "Administration into the urethra."
            },
            "19": {
                "name": "INTRASYNOVIAL",
                "short_name": "I-SYNOV",
                "nci_concept_id": "C38264",
                "definition": "Administration within the synovial cavity of a joint."
            },
            "20": {
                "name": "INTRATUMOR",
                "short_name": "I-TUMOR",
                "nci_concept_id": "C38269",
                "definition": "Administration within a tumor."
            },
            "21": {
                "name": "INTRAVASCULAR",
                "short_name": "I-VASC",
                "nci_concept_id": "C38273",
                "definition": "Administration within a vessel or vessels."
            },
            "22": {
                "name": "INTRASPINAL",
                "short_name": "I-SPINAL",
                "nci_concept_id": "C38263",
                "definition": "Administration within the vertebral column."
            },
            "23": {
                "name": "INTRACAVITARY",
                "short_name": "I-CAVIT",
                "nci_concept_id": "C38231",
                "definition": "Administration within a non-pathologic cavity, such as that of the cervix, uterus, or penis, or such as that which is formed as the result of a wound."
            },
            "24": {
                "name": "SUBLINGUAL",
                "short_name": "SL",
                "nci_concept_id": "C38300",
                "definition": "Administration beneath the tongue."
            },
            "25": {
                "name": "INTRABURSAL",
                "short_name": "I-BURSAL",
                "nci_concept_id": "C38226",
                "definition": "Administration within a bursa."
            },
            "27": {
                "name": "INTRACARDIAC",
                "short_name": "I-CARDI",
                "nci_concept_id": "C38227",
                "definition": "Administration with the heart."
            },
            "28": {
                "name": "INTRAUTERINE",
                "short_name": "I-UTER",
                "nci_concept_id": "C38272",
                "definition": "Administration within the uterus."
            },
            "30": {
                "name": "BUCCAL",
                "short_name": "BUCCAL",
                "nci_concept_id": "C38193",
                "definition": "Administration directed toward the cheek, generally from within the mouth."
            },
            "32": {
                "name": "IRRIGATION",
                "short_name": "IRRIG",
                "nci_concept_id": "C38281",
                "definition": "Administration to bathe or flush open wounds or body cavities."
            },
            "34": {
                "name": "RETROBULBAR",
                "short_name": "RETRO",
                "nci_concept_id": "C38296",
                "definition": "Administration behind the pons or behind the eyeball."
            },
            "36": {
                "name": "INTRAOCULAR",
                "short_name": "I-OCUL",
                "nci_concept_id": "C38255",
                "definition": "Administration within the eye."
            },
            "37": {
                "name": "INTRA-ARTERIAL",
                "short_name": "I-ARTER",
                "nci_concept_id": "C38222",
                "definition": "Administration within an artery or arteries."
            },
            "38": {
                "name": "DENTAL",
                "short_name": "DENTAL",
                "nci_concept_id": "C38197",
                "definition": "Administration to a tooth or teeth."
            },
            "40": {
                "name": "PERIODONTAL",
                "short_name": "P-ODONT",
                "nci_concept_id": "C38294",
                "definition": "Administration around a tooth."
            },
            "42": {
                "name": "INTRALESIONAL",
                "short_name": "I-LESION",
                "nci_concept_id": "C38250",
                "definition": "Administration within or introduced directly into a localized lesion."
            },
            "43": {
                "name": "INTRAPLEURAL",
                "short_name": "I-PLEURAL",
                "nci_concept_id": "C38259",
                "definition": "Administration within the pleura."
            },
            "45": {
                "name": "PERIARTICULAR",
                "short_name": "P-ARTIC",
                "nci_concept_id": "C38292",
                "definition": "Administration around a joint."
            },
            "46": {
                "name": "INTRAGASTRIC",
                "short_name": "I-GASTRIC",
                "nci_concept_id": "C38246",
                "definition": "Administration within the stomach."
            },
            "47": {
                "name": "INTRADUODENAL",
                "short_name": "I-DUOD",
                "nci_concept_id": "C38241",
                "definition": "Administration within the duodenum."
            },
            "48": {
                "name": "INTRAVENTRICULAR",
                "short_name": "I-VENTRIC",
                "nci_concept_id": "C38277",
                "definition": "Administration within a ventricle."
            },
            "49": {
                "name": "INTRATENDINOUS",
                "short_name": "I-TENDIN",
                "nci_concept_id": "C38265",
                "definition": "Administration within a tendon."
            },
            "50": {
                "name": "PERIDURAL",
                "short_name": "P-DURAL",
                "nci_concept_id": "C38677",
                "definition": "Administration to the outside of the dura mater of the spinal cord.."
            },
            "52": {
                "name": "INTRADURAL",
                "short_name": "I-DURAL",
                "nci_concept_id": "C38242",
                "definition": "Administration within or beneath the dura."
            },
            "53": {
                "name": "SUBMUCOSAL",
                "short_name": "S-MUCOS",
                "nci_concept_id": "C38301",
                "definition": "Administration beneath the mucous membrane."
            },
            "55": {
                "name": "IONTOPHORESIS",
                "short_name": "ION",
                "nci_concept_id": "C38203",
                "definition": "Administration by means of an electric current where ions of soluble salts migrate into the tissues of the body."
            },
            "56": {
                "name": "INTRA-ABDOMINAL",
                "short_name": "I-ABDOM",
                "nci_concept_id": "C38220",
                "definition": "Administration within the abdomen."
            },
            "57": {
                "name": "EXTRACORPOREAL",
                "short_name": "X-CORPOR",
                "nci_concept_id": "C38212",
                "definition": "Administration outside of the body."
            },
            "60": {
                "name": "INTRA-AMNIOTIC",
                "short_name": "I-AMNI",
                "nci_concept_id": "C38221",
                "definition": "Administration within the amnion."
            },
            "61": {
                "name": "INTRAPROSTATIC",
                "short_name": "I-PROSTAT",
                "nci_concept_id": "C38260",
                "definition": "Administration within the prostate gland."
            },
            "66": {
                "name": "SUBARACHNOID",
                "short_name": "S-ARACH",
                "nci_concept_id": "C38297",
                "definition": "Administration beneath the arachnoid."
            },
            "67": {
                "name": "INTRABRONCHIAL",
                "short_name": "I-BRONCHI",
                "nci_concept_id": "C38225",
                "definition": "Administration within a bronchus."
            },
            "68": {
                "name": "CONJUNCTIVAL",
                "short_name": "CONJUNC",
                "nci_concept_id": "C38194",
                "definition": "Administration to the conjunctiva, the delicate membrane that lines the eyelids and covers the exposed surface of the eyeball."
            },
            "71": {
                "name": "NASOGASTRIC",
                "short_name": "NG",
                "nci_concept_id": "C38285",
                "definition": "Administration through the nose and into the stomach, usually by means of a tube."
            },
            "72": {
                "name": "INTRAESOPHAGEAL",
                "short_name": "I-ESO",
                "nci_concept_id": "C38245",
                "definition": "Administration within the esophagus."
            },
            "88": {
                "name": "INTERSTITIAL",
                "short_name": "INTERSTIT",
                "nci_concept_id": "C38219",
                "definition": "Administration to or in the interstices of a tissue."
            },
            "96": {
                "name": "SUBCONJUNCTIVAL",
                "short_name": "S-CONJUNC",
                "nci_concept_id": "C38298",
                "definition": "Administration beneath the conjunctiva."
            },
            "103": {
                "name": "INTRATHECAL",
                "short_name": "IT",
                "nci_concept_id": "C38267",
                "definition": "Administration within the cerebrospinal fluid at any level of the cerebrospinal axis, including injection into the cerebral ventricles."
            },
            "109": {
                "name": "SOFT TISSUE",
                "short_name": "SOFT TIS",
                "nci_concept_id": "C38198",
                "definition": "Administration into any soft tissue."
            },
            "110": {
                "name": "INTRATESTICULAR",
                "short_name": "I-TESTIC",
                "nci_concept_id": "C38266",
                "definition": "Administration within the testicle."
            },
            "112": {
                "name": "URETERAL",
                "short_name": "URETER",
                "nci_concept_id": "C38312",
                "definition": "Administration into the ureter."
            },
            "113": {
                "name": "PERCUTANEOUS",
                "short_name": "PERCUT",
                "nci_concept_id": "C38676",
                "definition": "Administration through the skin."
            },
            "117": {
                "name": "INTRACORONAL, DENTAL",
                "short_name": "I-CORONAL",
                "nci_concept_id": "C38217",
                "definition": "Administration of a drug within a portion of a tooth which is covered by enamel and which is separated from the roots by a slightly constricted region known as the neck."
            },
            "119": {
                "name": "INTRACORONARY",
                "short_name": "I-CORONARY",
                "nci_concept_id": "C38218",
                "definition": "Administration within the coronary arteries."
            },
            "121": {
                "name": "INTRADISCAL",
                "short_name": "I-DISCAL",
                "nci_concept_id": "C38239",
                "definition": "Administration within a disc."
            },
            "122": {
                "name": "TRANSMUCOSAL",
                "short_name": "T-MUCOS",
                "nci_concept_id": "C38283",
                "definition": "Administration across the mucosa."
            },
            "123": {
                "name": "INTRADUCTAL",
                "short_name": "I-DUCTAL",
                "nci_concept_id": "C38240",
                "definition": "Administration within the duct of a gland."
            },
            "124": {
                "name": "TRANSTYMPANIC",
                "short_name": "T-TYMPAN",
                "nci_concept_id": "C38309",
                "definition": "Administration across or through the tympanic cavity."
            },
            "127": {
                "name": "INTRAEPIDERMAL",
                "short_name": "I-EPIDERM",
                "nci_concept_id": "C38243",
                "definition": "Administration within the epidermis."
            },
            "128": {
                "name": "INTRAVESICAL",
                "short_name": "I-VESIC",
                "nci_concept_id": "C38278",
                "definition": "Administration within the bladder."
            },
            "130": {
                "name": "CUTANEOUS",
                "short_name": "CUTAN",
                "nci_concept_id": "C38675",
                "definition": "Administration to the skin."
            },
            "131": {
                "name": "ENDOCERVICAL",
                "short_name": "E-CERVIC",
                "nci_concept_id": "C38205",
                "definition": "Administration within the canal of the cervix uteri.? Synonymous with the term intracervical.."
            },
            "132": {
                "name": "INTRACAVERNOUS",
                "short_name": "I-CAVERN",
                "nci_concept_id": "C38230",
                "definition": "Administration within a pathologic cavity, such as? occurs in the lung in tuberculosis."
            },
            "133": {
                "name": "ENDOSINUSIAL",
                "short_name": "E-SINUS",
                "nci_concept_id": "C38206",
                "definition": "Administration within the nasal sinuses of the head."
            },
            "134": {
                "name": "OCCLUSIVE DRESSING TECHNIQUE",
                "short_name": "OCCLUS",
                "nci_concept_id": "C38286",
                "definition": "Administration by the topical route which is then covered by a dressing which occludes the area."
            },
            "135": {
                "name": "OTHER",
                "short_name": "OTHER",
                "nci_concept_id": "C38290",
                "definition": "Administration is different from others on this list."
            },
            "136": {
                "name": "RESPIRATORY (INHALATION)",
                "short_name": "RESPIR",
                "nci_concept_id": "C38216",
                "definition": "Administration within the respiratory tract by inhaling orally or nasally for local or systemic effect."
            },
            "137": {
                "name": "INTRAVENOUS DRIP",
                "short_name": "IV DRIP",
                "nci_concept_id": "C38279",
                "definition": "Administration within or into a vein or veins over a sustained period of time."
            },
            "138": {
                "name": "INTRAVENOUS BOLUS",
                "short_name": "IV BOLUS",
                "nci_concept_id": "C38274",
                "definition": "Administration within or into a vein or veins all at once."
            },
            "139": {
                "name": "UNKNOWN",
                "short_name": "UNKNOWN",
                "nci_concept_id": "C38311",
                "definition": "Route of administration is unknown."
            },
            "140": {
                "name": "HEMODIALYSIS",
                "short_name": "HEMO",
                "nci_concept_id": "C38200",
                "definition": "Administration through hemodialysate fluid."
            },
            "307": {
                "name": "INTRAGINGIVAL",
                "short_name": "I-GINGIV",
                "nci_concept_id": "C38247",
                "definition": "Administration within the gingivae."
            },
            "310": {
                "name": "INTRALUMINAL",
                "short_name": "I-LUMIN",
                "nci_concept_id": "C38251",
                "definition": "Administration within the lumen of a tube."
            },
            "311": {
                "name": "INTRAVITREAL",
                "short_name": "I-VITRE",
                "nci_concept_id": "C38280",
                "definition": "Administration within the vitreous body of the eye."
            },
            "312": {
                "name": "NOT APPLICABLE",
                "short_name": "NA",
                "nci_concept_id": "C48623",
                "definition": "Routes of administration are not applicable."
            },
            "313": {
                "name": "ENTERAL",
                "short_name": "ENTER",
                "nci_concept_id": "C38209",
                "definition": "Administration directly into the intestines."
            },
            "314": {
                "name": "INTRAPERICARDIAL",
                "short_name": "I-PERICARD",
                "nci_concept_id": "C38257",
                "definition": "Administration within the pericardium."
            },
            "352": {
                "name": "INTRALYMPHATIC",
                "short_name": "I-LYMPHAT",
                "nci_concept_id": "C38252",
                "definition": "Administration within the lymph."
            },
            "353": {
                "name": "INTRATUBULAR",
                "short_name": "I-TUBUL",
                "nci_concept_id": "C38268",
                "definition": "Administration within the tubules of an organ."
            },
            "354": {
                "name": "INTRAOVARIAN",
                "short_name": "I-OVAR",
                "nci_concept_id": "C38256",
                "definition": "Administration within the ovary."
            },
            "355": {
                "name": "TRANSTRACHEAL",
                "short_name": "T-TRACHE",
                "nci_concept_id": "C38308",
                "definition": "Administration through the wall of the trachea."
            },
            "357": {
                "name": "ELECTRO-OSMOSIS",
                "short_name": "EL-OSMOS",
                "nci_concept_id": "C38633",
                "definition": "Administration of through the diffusion of substance through a membrane in an electric field."
            },
            "358": {
                "name": "TRANSDERMAL",
                "short_name": "T-DERMAL",
                "nci_concept_id": "C38305",
                "definition": "Administration through the dermal layer of the skin to the systemic circulation by diffusion."
            },
            "361": {
                "name": "INFILTRATION",
                "short_name": "INFIL",
                "nci_concept_id": "C38215",
                "definition": "Administration that results in substances passing into tissue spaces or into cells."
            },
            "362": {
                "name": "INTRABILIARY",
                "short_name": "I-BILI",
                "nci_concept_id": "C38224",
                "definition": "Administration within the bile, bile ducts or gallbladder."
            },
            "363": {
                "name": "INTRACARTILAGINOUS",
                "short_name": "I-CARTIL",
                "nci_concept_id": "C38228",
                "definition": "Administration within a cartilage; endochondral."
            },
            "364": {
                "name": "LARYNGEAL",
                "short_name": "LARYN",
                "nci_concept_id": "C38282",
                "definition": "Administration directly upon the larynx."
            },
            "365": {
                "name": "INTRAILEAL",
                "short_name": "I-ILE",
                "nci_concept_id": "C38249",
                "definition": "Administration within the distal portion of the small intestine, from the jejunum to the cecum."
            },
            "366": {
                "name": "INTRATYMPANIC",
                "short_name": "I-TYMPAN",
                "nci_concept_id": "C38270",
                "definition": "Administration within the aurus media."
            },
            "400": {
                "name": "UNASSIGNED",
                "short_name": "UNAS",
                "nci_concept_id": "C38310",
                "definition": "Route of administration has not yet been assigned."
            },
            "401": {
                "name": "ENDOTRACHEAL",
                "short_name": "E-TRACHE",
                "nci_concept_id": "C38208",
                "definition": "Administration directly into the trachea."
            },
            "402": {
                "name": "EXTRA?AMNIOTIC",
                "short_name": "X-AMNI",
                "nci_concept_id": "C38211",
                "definition": "Administration to the outside of the membrane enveloping the fetus"
            },
            "403": {
                "name": "INTRACORPORUS CAVERNOSUM",
                "short_name": "I-CORPOR",
                "nci_concept_id": "C38235",
                "definition": "Administration within the dilatable spaces of the corporus cavernosa of the penis."
            },
            "404": {
                "name": "INTRACEREBRAL",
                "short_name": "I-CERE",
                "nci_concept_id": "C38232",
                "definition": "Administration within the cerebrum."
            },
            "405": {
                "name": "INTRACISTERNAL",
                "short_name": "I-CISTERN",
                "nci_concept_id": "C38233",
                "definition": "Administration within the cisterna magna cerebellomedularis."
            },
            "406": {
                "name": "INTRACORNEAL",
                "short_name": "I-CORNE",
                "nci_concept_id": "C38234",
                "definition": "Administration within the cornea (the transparent structure forming the anterior part of the fibrous tunic of the eye)."
            },
            "408": {
                "name": "INTRAMEDULLARY",
                "short_name": "I-MEDUL",
                "nci_concept_id": "C38253",
                "definition": "Administration within the marrow cavity of a bone."
            },
            "409": {
                "name": "INTRAMENINGEAL",
                "short_name": "I-MENIN",
                "nci_concept_id": "C38254",
                "definition": "Administration within the meninges (the three membranes that envelope the brain and spinal cord)."
            },
            "410": {
                "name": "OROPHARYNGEAL",
                "short_name": "ORO",
                "nci_concept_id": "C38289",
                "definition": "Administration directly to the mouth and pharynx."
            },
            "411": {
                "name": "PARENTERAL",
                "short_name": "PAREN",
                "nci_concept_id": "C38291",
                "definition": "Administration by injection, infusion, or implantation."
            },
            "412": {
                "name": "PERINEURAL",
                "short_name": "P-NEURAL",
                "nci_concept_id": "C38293",
                "definition": "Administration surrounding a nerve or nerves."
            },
            "413": {
                "name": "INTRACAUDAL",
                "short_name": "I-CAUDAL",
                "nci_concept_id": "C38229",
                "definition": "Administration within the cauda equina."
            },
            "414": {
                "name": "INTRAPULMONARY",
                "short_name": "I-PULMON",
                "nci_concept_id": "C38261",
                "definition": "Administration within the lungs or its bronchi."
            },
            "415": {
                "name": "TRANSPLACENTAL",
                "short_name": "T-PLACENT",
                "nci_concept_id": "C38307",
                "definition": "Administration through or across the placenta."
            },
            "FDA CODE": {
                "name": "NAME",
                "short_name": "SHORT NAME",
                "nci_concept_id": "NCI CONCEPT ID",
                "definition": "DEFINITION"
            }
        },
        units: {
            'G': 'grams ',
            'MCG': "micrograms",
            'MG': 'milligrams',
            'L': 'liters',
            'ML': 'milliliters',
            'U': 'units'
        },
        encounterTypes: {
            'DO': 'Routine Doctor Office Visit',
            'AV': 'Ambulatory Visit',
            'ED': 'Emergency Department',
            'IP': 'Inpatient Hospital Stay',
            'IS': 'Non-Acute Institutional Stay',
            'HO': 'Home', // added by JP
            'EP': 'Not Formal Encounter' // added by JP/AM. Means that this encounter is not linked to a real encounter ID
        },
        dischargeDispositions: {
            'A': 'Discharged alive',
            'E': 'Expired',
            'U': 'Uknown'
        },
        diagnosisRelatedGroupTypes: {
            'N': 'New',
            'O': 'Old'
        },
        // TODO: convert triState and twoState into a subtype (with length validators and explicit lists)?
        triState: {
            'Y': 'Yes',
            'N': 'No',
            'U': 'Unknown'
        },
        twoState: {
            'Y': 'Yes',
            'N': 'No'
        },
        genders: {
            'M': 'Male',
            'F': 'Female',
            'T': 'Trans-gender',
            'N': 'Prefer not to Answer'
        },
        ages: {
          "0-11": "Under 12 years old",
          "12-17": "12-17 years old",
          "18-24": "18-24 years old",
          "25-34": "25-34 years old",
          "35-44": "35-44 years old",
          "45-54": "45-54 years old",
          "55-64": "55-64 years old",
          "65-74": "65-74 years old",
          "75-": "75 years or older"
        },
        geographicRegions: {
            'NE': 'Northeast',
            'SE': 'Southeast',
            'SW': 'Southwest',
            'MW': 'Midwest',
            'NW': 'Northwest'
        },
        races: {
            '0': 'Unknown',
            '1': 'American Indian or Alaska Native',
            '2': 'Asian',
            '3': 'Black or African American',
            '4': 'Native Hawaiian or Other Pacific Islander',
            '5': 'White'
        },
        diagnosisCodeTypes: {
            '09': 'ICD-9-CM',
            '10': 'ICD-10-CM',
            '11': 'ICD-11-CM',
            'SM': 'SNOMED CT',
            'OT': 'Other'
        },
        principalDischargeDiagnosisFlags: {
            'P': 'Principal',
            'S': 'Secondary',
            'X': 'Unable to Classify'
        },
        procedureCodeTypes: {
            '09': 'ICD-9-CM',
            '10': 'ICD-10-CM',
            '11': 'ICD-11-CM',                          // not in vax
            'C2': 'CPT Category II',                    // not in vax
            'C3': 'CPT Category III',                   // not in vax
            'C4': 'CPT-4 (i.e., HCPCS Level I) ',
            'H3': 'HCPCS Level III',
            'HC': 'HCPCS (i.e., HCPCS Level II) ',
            'LC': 'LOINC',                              // not in lab, vax
            'LO': 'Local homegrown',
            'ND': 'NDC',                                // not in lab, vax
            'OT': 'Other',
            'VX': 'CVX',                                // only in vax
            'RE': 'Revenue'
        },
        dateImputedTypes: {
            'B': 'Both month and day imputed',
            'D': 'Day imputed',
            'M': 'Month imputed',
            'N': 'Not imputed'
        },
        deathConfidenceTypes: {
            'E': 'Excellent',
            'F': 'Fair',
            'P': 'Poor'
        },
        deathSourceTypes: {
            'L': 'Other, locally defined',
            'N': 'National Death Index',
            'S': 'State Death files',
            'T': 'Tumor data'
        },
        causeOfDeathCodeTypes: {
            'C': 'Contributory',
            'I': 'Immediate/Primary O = Other',
            'U': 'Underlying'
        },
        deathSources: {
            'L': 'Other, locally defined',
            'N': 'National Death Index',
            'S': 'State Death files',
            'T': 'Tumor data'
        },
        testNames: {
            'ALP': 'alkaline phosphatase',
            'ALT': 'alanine aminotransferase',
            'ANC': 'absolute neutrophil count',
            'BILI_TOT': 'total bilirubin',
            'CHOL_HDL': 'cholesterol high density lipoprotein',
            'CHOL_LDL': 'cholesterol low density lipoprotein',
            'CHOL_TOT': 'cholesterol total',
            'CK': 'creatine kinase total',
            'CK_MB': 'creatine kinase MB',
            'CK_MBI': 'creatine kinase MB/creatine kinase total',
            'CREATININE': 'creatinine',
            'D_DIMER': 'd-dimer',
            'GLUCOSE': 'glucose',
            'HGB': 'hemoglobin',
            'HGBA1C': 'glycosylated hemoglobin',
            'INF_A': 'influenza virus A',
            'INF_AB': 'influenza virus A + B',
            'INF_B': 'influenza virus B',
            'INF_NS': 'influenza virus not specified',
            'INR': 'international normalized ratio',
            'LIPASE': 'lipase',
            'PG': 'pregnancy test',
            'PLATELETS': 'platelet count',
            'SODIUM': 'sodium',
            'TRIG': 'triglycerides',
            'TROP_I': 'troponin I cardiac',
            'TROP_T': 'troponin T cardiac',
            'TSH': 'thyroid stimulating hormone'
        },
        resultTypes: {
            'N': 'Numeric',
            'C': 'Character'
        },
        testSubCategories: {
            'BHCG': 'beta human choriogonadotropin CLC = calculated',
            'CLC': 'Calculated',
            'DDU': 'd-dimer units',
            'DIRECT': 'direct',
            'EIA': 'enzyme immunoassay',
            'FEU': 'fibrinogen equivalent units HCG = human choriogonadotropin',
            'IF': 'immunofluorescence',
            'NS': 'not specified',
            'PCR': 'probe and target amplification VTC = organism-specific culture'
        },
        fastingIndicators: {
            'F': 'fasting',
            'R': 'random',
            'X': 'not applicable'
        },
        specimenSources: {
            'BAL': 'bronchoalveolar lavage BALBX = bronchoalveolar biopsy BLOOD = blood',
            'CSF': 'cerebrospinal fluid',
            'NPH': 'nasopharyngeal swab',
            'NPWASH': 'nasopharyngeal wash NSWAB = nasal swab or nose specimen NWASH = nasal wash',
            'OTHER': 'other',
            'PLASMA': 'plasma',
            'PPP': 'platelet poor plasma',
            'SERUM': 'serum',
            'SPUTUM': 'sputum',
            'SR_PLS': 'serum/plasma',
            'THRT': 'throat swab, oropharyngeal swab UNK = unknown or null',
            'URINE': 'urine'
        },
        testImmediacyTypes: {
            'E': 'Expedite',
            'R': 'Routine',
            'S': 'Stat',
            'U': 'Unknown or null'
        },
        patientLocationTypes: {
            'E': 'Emergency department ',
            'I': 'Inpatient',
            'O': 'Outpatient',
            'U': 'Unknown or null',
            'H': 'Home' // added by JP
        },
        resultLocationTypes: {
            'L': 'Lab',
            'P': 'Point of Care',
            'H': 'Home' // added by JP
        },
        standardizedCharacterResultValueTypes: {
            'BORDERLINE': 'Borderline',
            'NEGATIVE': 'Negative',
            'POSITIVE': 'Positive',
            'UNDETERMINED': 'Undetermined',
            'RANGE': 'Range: start |end unit'
        },
        labTestModifiers: {
            'EQ': 'equal',
            'GE': 'greater than or equal to',
            'GT': 'greater than',
            'LE': 'less than or equal to',
            'LT': 'less than',
            'TX': 'text'
        },
        labTestLowModifiers: {
            'EQ': 'equal',
            'GE': 'greater than or equal to',
            'GT': 'greater than'
        },
        labTestHighModifiers: {
            'EQ': 'equal',
            'LE': 'less than or equal to',
            'LT': 'less than'
        },
        abnormalResultIndicators: {
            'AB': 'abnormal',
            'AH': 'abnormally high',
            'AL': 'abnormally low',
            'CH': 'critically high',
            'CL': 'critically low',
            'CR': 'critical',
            'IN': 'inconclusive',
            'NL': 'normal',
            'UN': 'unknown'
        },
        bloodPressureTypes: {
            'E': 'Extended',
            'M': 'Multiple',
            'O': 'Orthostatic',
            'R': 'Rooming'
        },
        bloodTestPositionTypes: {
            '1': 'Sitting',
            '2': 'Standing',
            '3': 'Supine'
        },
        tobaccoStatuses: {
            '1': 'Current user',
            '2': 'Never',
            '3': 'Quit/former user',
            '4': 'Passive',
            '5': 'Environmental exposure',
            '6': 'Not asked',
            '7': 'Conflicting'
        },
        tobaccoType: {
            '1': 'Cigarettes only',
            '2': 'Other tobacco only',
            '3': 'Cigarettes and other tobacco ',
            '4': 'None'
        },
        iisList: {
            "AL": "Alabama",
            "AK": "Alaska",
            "AS": "American Samoa",
            "AZ": "Arizona",
            "AR": "Arkansas",
            "CA": "California",
            "CO": "Colorado",
            "CT": "Connecticut",
            "DE": "Delaware",
            "DC": "District Of Columbia",
            "FM": "Federated States Of Micronesia",
            "FL": "Florida",
            "GA": "Georgia",
            "GU": "Guam",
            "HI": "Hawaii",
            "ID": "Idaho",
            "IL": "Illinois",
            "IN": "Indiana",
            "IA": "Iowa",
            "KS": "Kansas",
            "KY": "Kentucky",
            "LA": "Louisiana",
            "ME": "Maine",
            "MH": "Marshall Islands",
            "MD": "Maryland",
            "MA": "Massachusetts",
            "MI": "Michigan",
            "MN": "Minnesota",
            "MS": "Mississippi",
            "MO": "Missouri",
            "MT": "Montana",
            "NE": "Nebraska",
            "NV": "Nevada",
            "NH": "New Hampshire",
            "NJ": "New Jersey",
            "NM": "New Mexico",
            "NY": "New York",
            "NC": "North Carolina",
            "ND": "North Dakota",
            "MP": "Northern Mariana Islands",
            "OH": "Ohio",
            "OK": "Oklahoma",
            "OR": "Oregon",
            "PW": "Palau",
            "PA": "Pennsylvania",
            "PR": "Puerto Rico",
            "RI": "Rhode Island",
            "SC": "South Carolina",
            "SD": "South Dakota",
            "TN": "Tennessee",
            "TX": "Texas",
            "UT": "Utah",
            "VT": "Vermont",
            "VI": "Virgin Islands",
            "VA": "Virginia",
            "WA": "Washington",
            "WV": "West Virginia",
            "WI": "Wisconsin",
            "WY": "Wyoming"
        },
        vaccinationAdministrationType: {
            'IP': 'Inpatient Hospital Stay',
            'ED': 'Emergency Department',
            'AV': 'Ambulatory Visit',
            'IS': 'InstitutionalStay',
            'SC': 'School',
            'CC': 'Child Care',
            'FP': 'Family Planning',
            'PH': 'Pharmacy',
            'HD': 'Health department',
            'EM': 'Employer clinic',
            'MC': 'Mass clinic',
            'NA': 'Not applicable',
            'OT': 'Other',
            'UN': 'Unknown'
        },
        citizenConditions: {
            // To be completed in HC-33, HC-34, HC-35 as a separate deliverable for synthetic patients generator
        },
        sourceTypes: {
            'M': 'Manual Entry',
            'P': 'Pre-existing Entry',
            'I': 'Imported from External Source',
            'D': 'Information from a device'
        },
        alertsIssuers: {
            'FDA': 'U.S. Food and Drug Administration'
        },
        voluntaryMandated: {
            voluntary: "Voluntary",
            voluntary_firm_initiated: "Voluntary: Firm Initiated",
            mandated: "Mandated",
            other: "Other"
        },
        alertsTypes: {
            "recall": "Recall"
        },
        usageFrequency: {
            '1PD': 'one time per day',
            '2PD': 'two times per day',
            '3PD': 'three times per day',
            '4PD': 'four times per day',
            '1PH': 'every 1 hour',
            '2PH': 'every 2 hours',
            '3PH': 'every 3 hours',
            '4PH': 'every 4 hours',
            '6PH': 'every 6 hours',
            '8PH': 'every 8 hours',
            '12PH': 'every 12 hours',
            'AN': 'as needed'
        },
        deviceUsage: {
            'CON': 'continuously',
            '1PD': 'one or more times per day',
            'AN': 'as needed'
        },
        loincCodes: {
            "ALP": '32135-6',
            "ALT": '1743-4',
            "BILI_TOT": '1975-2',
            "CHOL_HDL": '2085-9',
            "CHOL_LDL": '2090-9',
            "CHOL_TOT": '74435-9',
            "CK": '72561-4',
            "CK_MB": '2154-3',
            "CK_MBI": '12189-7',
            "CREATININE": '14682-9',
            "GLUCOSE": '14749-6',
            "HGBA1C": '41995-2'
        },
        primarySourceQualifications: {
            "1": "Physician",
            "2": "Pharmacist",
            "3": "Other health professional",
            "4": "Lawyer",
            "5": "Consumer or non-health professional"
        },
        medicalSpeciality: {
            "AN": "Anesthesiology",
            "CV": "Cardiovascular",
            "CH": "Clinical Chemistry",
            "DE": "Dental",
            "EN": "Ear, Nose, Throat",
            "GU": "Gastroenterology, Urology",
            "HO": "General Hospital",
            "HE": "Hematology",
            "IM": "Immunology",
            "MI": "Microbiology",
            "NE": "Neurology",
            "OB": "Obstetrics/Gynecology",
            "OP": "Ophthalmic",
            "OR": "Orthopedic",
            "PA": "Pathology",
            "PM": "Physical Medicine",
            "RA": "Radiology",
            "SU": "General, Plastic Surgery",
            "TX": "Clinical Toxicology"
        },
        deviceClasses: {
            "1": "Class I (low to moderate risk): general controls",
            "2": "Class II (moderate to high risk): general controls and special controls",
            "3": "Class III (high risk): general controls and Premarket Approval (PMA)",
            "U": "Unclassified",
            "N": "Not classified",
            "F": "HDE"
        },
        unclassifiedReasons: {
            "1": "Pre-Amendment",
            "2": "IDE",
            "3": "For Export Only",
            "4": "Unknown",
            "5": "Guidance Under Development",
            "6": "Enforcement Discretion",
            "7": "Not FDA Regulated"
        },
        loincCodesNames: {
            "ALP": 'alkaline phosphatase',
            "ALT": 'alanine aminotransferase',
            "BILI_TOT": 'total bilirubin',
            "CHOL_HDL": 'cholesterol high density lipoprotein',
            "CHOL_LDL": 'cholesterol low density lipoprotein',
            "CHOL_TOT": 'cholesterol total',
            "CK": 'creatine kinase total',
            "CK_MB": 'creatine kinase MB',
            "CK_MBI": 'creatine kinase MB/creatine kinase total',
            "CREATININE": 'creatinine',
            "GLUCOSE": 'glucose',
            "HGBA1C": 'glycosylated hemoglobin'

        },
        submissionTypeIds: {
            "IDK": "Please populate this list: submission_type_ids"
        },
        bloodPressurePosition: {
            '1': 'Sitting',
            '2': 'Standing',
            '3': 'Supine'
        },
        meals: {
            'BR': 'Breakfast',
            'SM': 'Morning Snack',
            'LU': 'Lunch',
            'AS': 'Afternoon Snack',
            'DI': 'Dinner',
            'NS': 'Night Snack'
        },
        dayTime: {
            'WU': 'Wake Up',
            'MO': 'Morning',
            'MD': 'Mid-Day',
            'AF': 'Afternoon',
            'EV': 'Evening',
            'BT': 'Bedtime'
        },
        testTypes: {
            "1": "Blood Glucose",
            "2": "Blood Pressure",
            "3": "Blood Oxygen",
            "4": "Weight",
            "5": "Lung Volume",
            "6": "Heart Rate"
        },
        ageRanges: {
            '1': '0-5',
            '2': '6-10',
            '3': '11-20',
            '4': '21-30',
            '5': '31-40',
            '6': '41-50',
            '7': '51-60',
            '8': '61-70',
            '9': '71-80',
            '10': '81-90',
            '11': '91-100',
            '12': '>100'
        },
        mealType: {
            "BA": {
                "name": "Balanced",
                "dashboardType": "Good"
            },
            "CL": {
                "name": "Carb Loaded",
                "dashboardType": "Bad"
            },
            "SL": {
                "name": "Sugar Loaded",
                "dashboardType": "Bad"
            },
            "HF": {
                "name": "High Fiber",
                "dashboardType": "Good"
            },
            "HP": {
                "name": "High Protein",
                "dashboardType": "Good"
            },
            "HT": {
                "name": "High Fat",
                "dashboardType": "Bad"
            }
        },
        medicationFrequency: {
            '1PD': 'one time per day',
            '2PD': 'two times per day',
            '3PD': 'three times per day',
            '4PD': 'four times per day',
            '1PH': 'every 1 hour',
            '2PH': 'every 2 hours',
            '3PH': 'every 3 hours',
            '4PH': 'every 4 hours',
            '6PH': 'every 6 hours',
            '8PH': 'every 8 hours',
            '12PH': 'every 12 hours',
            'AN': 'as needed'
        },
        vaccineFrequency: {
            '0': 'Single Dose',
            '1': '1st Dose',
            '2': '2nd Dose',
            '3': '3rd Dose',
            '4': '4th Dose',
            '5': '5th Dose',
            'BO': 'booster'
        },
        activities: {
            'AE': 'Aerobics (High Impact/Intensity & Training)',
            'AQ': 'Aquatic Exercise',
            'BD': 'Badminton',
            'BG': 'Bowling',
            'BI': 'Bicycling (BMX, Mountain, Road or Paved)',
            'BK': 'Basketball',
            'BS': 'Baseball',
            'BW': 'Boardsailing/Windsurfing',
            'BX': 'Boxing for Fitness',
            'CB': 'Calisthenics/Bodyweight Exercise & Training',
            'CC': 'Cardio Cross Trainer',
            'CH': 'Cheerleading',
            'CK': 'Cardio Kickboxing',
            'CL': 'Climbing (Sport/Indoor/Boulder/Mountain/Ice)',
            'CN': 'Canoeing',
            'CR': 'Cross-Training Style Workouts',
            'CT': 'Cardio Tennis',
            'DA': 'Dance, Step, Choreographed Exercise to Music',
            'FB': 'Football (Flag, Tackle, Touch)',
            'FH': 'Field Hockey',
            'FW': 'Free Weights (Barbells, Dumbells, Hand)',
            'GF': 'Golf',
            'GY': 'Gymnastics',
            'HI': 'Hiking (Day)',
            'HU': 'Hunting',
            'IH': 'Ice Hockey',
            'IS': 'Ice Skating',
            'JS': 'Jet Skiing',
            'KS': 'Kayaking (Recreational, Sea/Touring, White Water)',
            'LA': 'Lacrosse',
            'MA': 'Martial Arts',
            'MM': 'MMA for competition, fitness, combat',
            'PB': 'Paddelboarding',
            'PL': 'Pilates Training',
            'PT': 'Platform Tennis',
            'RB': 'Racquetball',
            'RF': 'Rafting',
            'RJ': 'Running/Jogging',
            'RM': 'Rowing Machine',
            'RU': 'Rugby (Traditional , Touch)',
            'SA': 'Sailing',
            'SB': 'Softball (Fast-Pitch & Slow-Pitch)',
            'SC': 'Scuba Diving',
            'SI': 'Skiing (Alpine/Downhill, Cross Country, Freestyle)',
            'SK': 'Skateboarding',
            'SL': 'Sledding/Saucer Riding/Snow Tubing',
            'SN': 'Snorkeling',
            'SO': 'Soccer (Indoor, Outdoor)',
            'SQ': 'Squash',
            'ST': 'Stretching',
            'SU': 'Surfing',
            'SW': 'Snowboarding',
            'SF': 'Swimming for Fitness, Team',
            'SY': 'Stationary Cycling (Group, Recumbent Upright)',
            'TC': 'Tai Chi',
            'TD': 'Treadmill',
            'TE': 'Tennis',
            'TL': 'Trail Running',
            'TN': 'Triathlon',
            'TR': 'Track and Field',
            'TT': 'Table Tennis',
            'UF': 'Ultimate Frisbee',
            'VO': 'Volleyball (Court, Grass, Sand/Beach)',
            'WF': 'Walking for Fitness',
            'WG': 'Wrestling',
            'WR': 'Weight/Resistance Machines',
            'WS': 'Water Skiing',
            'YO': 'Yoga (Traditional, Paddleboard)'
        },
        dataPullStates: {
            "scheduled": "Scheduled",
            "started": "Started",
            "inprogress": "In Progress",
            "done": "Completed",
            "failed": "Failed"
        },
        productKinds: {
            "device": "Device",
            "medication": "Medication",
            "tobacco": "Tobacco",
            "supplement": "Supplement",
            "vaccine": "Vaccine",
            "biologic": "Biologic"
        },
        dataSources: { // keep it in sync with CorpUtil/conceptant.js#dataPulls (or, in the future, 0_data_sources.json in the model)
            "openFdaDeviceAdverseEventArchive": "OpenFDA Device Adverse Events Local Archive",
            "openFdaDeviceAdverseEventOnline": "OpenFDA Device Adverse Events Online",
            "medicationsNdcProductCode": "Josh's awesome mediations list with NDC codes in CSV"
        },
        moodTypes: {
            "happy": {
                "name": "Happy",
                "dashboardType": "Good"
            },
            "sad": {
                "name": "Sad",
                "dashboardType": "Bad"
            },
            "energetic": {
                "name": "Energetic",
                "dashboardType": "Good"
            },
            "tired": {
                "name": "Tired",
                "dashboardType": "Bad"
            },
            "calm": {
                "name": "Calm",
                "dashboardType": "Good"
            },
            "anxious": {
                "name": "Anxious",
                "dashboardType": "Bad"
            }
        },
        medicalConditions: {
            "CHF": "Chronic Heart Disease (CHF)",
            "COPD": "Chronic Obstructive Pulmonary Disease (COPD)",
            "ESRD": "End State Renal Disease (ESRD)",
            "CVD": "Cerebral Vascular Disease (CVD)",
            "DPN": "Depression",
            "SLP": "Sleep Disorders",
            "CNR": "Cancer",
            "DLA": "Dyslipidemia",
            "OBY": "Obesity",
            "stroke": "Stroke",
            "HTx": "Hypertension",
            "ketoacidosis": "Ketoacidosis",
            "hyperosmolarity": "Hyperosmolarity",
            "renalManifestations": "Renal Manifestations",
            "hyperglycemicComa": "Hyperglycemic Coma",
            "ophthalmicManifestations": "Ophthalmic Manifestations",
            "neurologicalManifestations": "Neurological Manifestations",
            "peripheralCirculatoryDisorders": "Peripheral Circulatory Disorders",
            "hypoglycemicComa": "Hypoglycemic Coma",
            "otherSpecifiedHypoglycemia": "Other Specified Hypoglycemia",
            "hypoglycemiaUnspecified": "Hypoglycemia, Unspecified",
            "postsurgicalHypoinsulinemia": "Postsurgical Hypoinsulinemia",
            "abnormalityOfSecretionOfGlucagon": "Abnormality of Secretion of Glucagon",
            "abnormalityOfSecretionOfGastrin": "Abnormality of Secretion of Gastrin",
            "otherSpecifiedDisordersOfPancreaticInternalSecretion": "Other Specified Disorders of Pancreatic Internal Secretion",
            "unspecifiedDisorderOfPancreaticInternalSecretion": "Unspecified Disorder of Pancreatic Internal Secretion"
        },
        diabetesMedicationTypes: {
            "biguanides": "Biguanides",
            "sulfonylureas": "Sulfonylureas",
            "meglitinideDerivatives": "Meglitinide Derivatives",
            "alphaGlucosidaseInhibitors": "Alpha-Glucosidase Inhibitors",
            "thiazolidinedionesTzds": "Thiazolidinediones (TZDs)",
            "glucagonlikePeptide1Glp1Agonists": "Glucagonlike peptide?1 (GLP-1) agonists",
            "dipeptidylPeptidaseIvDpp4Inhibitors": "Dipeptidyl peptidase IV (DPP-4) Inhibitors",
            "selectiveSodiumGlucoseTransporter2Sglt2Inhibitors": "Selective sodium-glucose transporter-2 (SGLT-2) inhibitors",
            "insulins": "Insulins",
            "amylinomimetics": "Amylinomimetics",
            "bileAcidSequestrants": "Bile acid sequestrants",
            "dopamineAgonists": "Dopamine agonists"
        },
        procedures: {
            "59000": "Amniocentesis",
            "59000-1": "Antro-duodenal Motility Study",
            "59000-4": "CT Scan (Computerized Tomography)",
            "59000-10": "Insulin Pump for Diabetes",
            "59000-11": "Lap Band (Surgery)",
            "59000-12": "Parathyroidectomy",
            "59000-13": "Pneumococcal Vaccination (Pneumonia Vaccine)",
            "59000-14": "Tonometry",
            "59000-16": "Tuberculosis Skin Test (PPD Skin Test)",
            "59000-17": "Urinalysis",
            "59000-19": "Cataract Surgery"
        },
        diabetesTypes: {
            "25031": "Diabetes - type I",
            "25032": "Diabetes - type II",
            "64800": "Diabetes - gestational",
            "7751": "Neonatal diabetes"
        },
        diagnoses: {
            "24910": "Ketoacidosis",
            "24920": "Hyperosmolarity",
            "24940": "Renal manifestations",
            "24950": "Ophthalmic manifestations",
            "24960": "Neurological manifestations",
            "24971": "Peripheral circulatory disorders",
            "2510": "Hypoglycemic coma",
            "2511": "Other specified hypoglycemia",
            "2512": "Hypoglycemia, unspecified",
            "2514": "Abnormality of secretion of glucagon",
            "2515": "Abnormality of secretion of gastrin"
        },
        mainDiagnoses: {
            "24900": "Secondary diabetes mellitus without mention of complication, not stated as uncontrolled, or unspecified",
            "24901": "Secondary diabetes mellitus without mention of complication, uncontrolled",
            "24910": "Secondary diabetes mellitus with ketoacidosis, not stated as uncontrolled, or unspecified",
            "24911": "Secondary diabetes mellitus with ketoacidosis, uncontrolled",
            "24920": "Secondary diabetes mellitus with hyperosmolarity, not stated as uncontrolled, or unspecified",
            "24921": "Secondary diabetes mellitus with hyperosmolarity, uncontrolled",
            "24930": "Secondary diabetes mellitus with other coma, not stated as uncontrolled, or unspecified",
            "24931": "Secondary diabetes mellitus with other coma, uncontrolled",
            "24940": "Secondary diabetes mellitus with renal manifestations, not stated as uncontrolled, or unspecified",
            "24941": "Secondary diabetes mellitus with renal manifestations, uncontrolled",
            "24950": "Secondary diabetes mellitus with ophthalmic manifestations, not stated as uncontrolled, or unspecified",
            "24951": "Secondary diabetes mellitus with ophthalmic manifestations, uncontrolled",
            "24960": "Secondary diabetes mellitus with neurological manifestations, not stated as uncontrolled, or unspecified",
            "24961": "Secondary diabetes mellitus with neurological manifestations, uncontrolled",
            "24970": "Secondary diabetes mellitus with peripheral circulatory disorders, not stated as uncontrolled, or unspecified",
            "24971": "Secondary diabetes mellitus with peripheral circulatory disorders, uncontrolled",
            "24980": "Secondary diabetes mellitus with other specified manifestations, not stated as uncontrolled, or unspecified",
            "24981": "Secondary diabetes mellitus with other specified manifestations, uncontrolled",
            "24990": "Secondary diabetes mellitus with unspecified complication, not stated as uncontrolled, or unspecified",
            "24991": "Secondary diabetes mellitus with unspecified complication, uncontrolled",
            "25000": "Diabetes mellitus without mention of complication, type II or unspecified type, not stated as uncontrolled",
            "25001": "Diabetes mellitus without mention of complication, type I [juvenile type], not stated as uncontrolled",
            "25002": "Diabetes mellitus without mention of complication, type II or unspecified type, uncontrolled",
            "25003": "Diabetes mellitus without mention of complication, type I [juvenile type], uncontrolled",
            "25010": "Diabetes with ketoacidosis, type II or unspecified type, not stated as uncontrolled",
            "25011": "Diabetes with ketoacidosis, type I [juvenile type], not stated as uncontrolled",
            "25012": "Diabetes with ketoacidosis, type II or unspecified type, uncontrolled",
            "25013": "Diabetes with ketoacidosis, type I [juvenile type], uncontrolled",
            "25020": "Diabetes with hyperosmolarity, type II or unspecified type, not stated as uncontrolled",
            "25021": "Diabetes with hyperosmolarity, type I [juvenile type], not stated as uncontrolled",
            "25022": "Diabetes with hyperosmolarity, type II or unspecified type, uncontrolled",
            "25023": "Diabetes with hyperosmolarity, type I [juvenile type], uncontrolled",
            "25030": "Diabetes with other coma, type II or unspecified type, not stated as uncontrolled",
            "25031": "Diabetes with other coma, type I [juvenile type], not stated as uncontrolled",
            "25032": "Diabetes with other coma, type II or unspecified type, uncontrolled",
            "25033": "Diabetes with other coma, type I [juvenile type], uncontrolled",
            "25040": "Diabetes with renal manifestations, type II or unspecified type, not stated as uncontrolled",
            "25041": "Diabetes with renal manifestations, type I [juvenile type], not stated as uncontrolled",
            "25042": "Diabetes with renal manifestations, type II or unspecified type, uncontrolled",
            "25043": "Diabetes with renal manifestations, type I [juvenile type], uncontrolled",
            "25050": "Diabetes with ophthalmic manifestations, type II or unspecified type, not stated as uncontrolled",
            "25051": "Diabetes with ophthalmic manifestations, type I [juvenile type], not stated as uncontrolled",
            "25052": "Diabetes with ophthalmic manifestations, type II or unspecified type, uncontrolled",
            "25053": "Diabetes with ophthalmic manifestations, type I [juvenile type], uncontrolled",
            "25060": "Diabetes with neurological manifestations, type II or unspecified type, not stated as uncontrolled",
            "25061": "Diabetes with neurological manifestations, type I [juvenile type], not stated as uncontrolled",
            "25062": "Diabetes with neurological manifestations, type II or unspecified type, uncontrolled",
            "25063": "Diabetes with neurological manifestations, type I [juvenile type], uncontrolled",
            "25070": "Diabetes with peripheral circulatory disorders, type II or unspecified type, not stated as uncontrolled",
            "25071": "Diabetes with peripheral circulatory disorders, type I [juvenile type], not stated as uncontrolled",
            "25072": "Diabetes with peripheral circulatory disorders, type II or unspecified type, uncontrolled",
            "25073": "Diabetes with peripheral circulatory disorders, type I [juvenile type], uncontrolled",
            "25080": "Diabetes with other specified manifestations, type II or unspecified type, not stated as uncontrolled",
            "25081": "Diabetes with other specified manifestations, type I [juvenile type], not stated as uncontrolled",
            "25082": "Diabetes with other specified manifestations, type II or unspecified type, uncontrolled",
            "25083": "Diabetes with other specified manifestations, type I [juvenile type], uncontrolled",
            "25090": "Diabetes with unspecified complication, type II or unspecified type, not stated as uncontrolled",
            "25091": "Diabetes with unspecified complication, type I [juvenile type], not stated as uncontrolled",
            "25092": "Diabetes with unspecified complication, type II or unspecified type, uncontrolled",
            "25093": "Diabetes with unspecified complication, type I [juvenile type], uncontrolled",
            "2510": "Hypoglycemic coma",
            "2511": "Other specified hypoglycemia",
            "2512": "Hypoglycemia, unspecified",
            "2513": "Postsurgical hypoinsulinemia",
            "2514": "Abnormality of secretion of glucagon",
            "2515": "Abnormality of secretion of gastrin",
            "2518": "Other specified disorders of pancreatic internal secretion",
            "2519": "Unspecified disorder of pancreatic internal secretion",
            "64800": "Diabetes mellitus of mother, complicating pregnancy, childbirth, or the puerperium, unspecified as to episode of care or not applicable",
            "64801": "Diabetes mellitus of mother, complicating pregnancy, childbirth, or the puerperium, delivered, with or without mention of antepartum condition",
            "64802": "Diabetes mellitus of mother, complicating pregnancy, childbirth, or the puerperium, delivered, with mention of postpartum complication",
            "64803": "Diabetes mellitus of mother, complicating pregnancy, childbirth, or the puerperium, antepartum condition or complication",
            "64804": "Diabetes mellitus of mother, complicating pregnancy, childbirth, or the puerperium, postpartum condition or complication",
            "7751": "Neonatal diabetes mellitus"
        },
        glucoses: {
            "1": "Fasting Glucose: <100",
            "2": "Fasting Glucose: 100-150",
            "3": "Fasting Glucose: 151-200",
            "4": "Fasting Glucose: >200"
        },
        a1cs: {
            "1": "HbA1c: <5.7",
            "2": "HbA1c: 5.7-6.4",
            "3": "HbA1c: 6.5-8",
            "4": "HbA1c: >8"
        },
        resultsUnits: {
            "1": "Pounds (lbs).",
            "2": "Grams (g).",
            "3": "Grams per deciliter (g/dL).",
            "4": "Grams per liter (g/L).",
            "5": "International units per liter (IU/L).",
            "6": "International units per milliliter (IU/mL).",
            "7": "Micrograms (mcg).",
            "8": "Micrograms per deciliter (mcg/dL).",
            "9": "Micrograms per liter (mcg/L).",
            "12": "Micromoles per liter (mcmol/L).",
            "13": "Milliequivalents (mEq).",
            "14": "Milliequivalents per liter (mEq/L).",
            "15": "Milligrams (mg).",
            "16": "Milligrams per deciliter (mg/dL).",
            "17": "Milligrams per liter (mg/L).",
            "18": "Milli-international units per liter (mIU/L).",
            "19": "Milliliters (mL).",
            "20": "Millimeters (mm).",
            "21": "Millimeters of mercury (mm Hg).",
            "22": "Millimoles (mmol).",
            "23": "Millimoles per liter (mmol/L).",
            "36": "Titers.",
            "37": "Units per liter (U/L).",
            "38": "Units per milliliter (U/mL).",
            "39": "Percent (%)",
            "40": "Liters (l)",
            "41": "Beats per Minute (BPM)"
        },
        yearsWithDiabetes: {
            "1": "<1",
            "2": "1-3",
            "3": "4-10",
            "4": "11-20",
            "5": ">20"
        },
        sourceHLTypes: {
            'M': 'Manual Entry',
            'D': 'Information from a device'
        },
        sideEffects: {
            '1': 'Dizziness',
            '2': 'Sweating',
            '3': 'Blurred vision',
            '4': 'Dry mouth',
            '5': 'Palpitations'
        }
    };

    m.alertItemCountry = _(m.countriesListRaw).keyBy('code').mapValues('name').value();
    delete m.countriesListRaw;
    m.encountersAdmittingSource = _.omit(m.encounterDischargeAndAdmittingSources, ['EX']);
    m.encountersProcedureCodeTypes = _.omit(m.procedureCodeTypes, ['VX']);
    m.encountersLabtestsProcedureCodeTypes = _.omit(m.procedureCodeTypes, ['ND', 'VX']);
    m.encountersVaccinesVaccinationCodeTypes = _.omit(m.procedureCodeTypes, ['11', 'C2', 'C3', 'LC', 'ND']);

    return m;
};