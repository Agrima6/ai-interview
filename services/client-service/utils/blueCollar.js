// Blue-collar job profiles HR can pick when creating a drive. A drive's roleCategory is either the umbrella
// "BLUE_COLLAR" or one of these "BLUE_COLLAR_<ROLE>" values; every check for "is this a blue-collar drive" goes through
// isBlueCollar so a new role added here is treated the same everywhere (resume optional, plain-language interview).
// The label is also what the interview agent receives as the role name, and its words are what the agent matches to
// pick that role's own questions (workmate-iq-agent blue_collar.py), so keep them plain and conventional.
// The client keeps the same list in client/src/constants/blueCollarRoles.js (a test keeps the two in step).
export const BLUE_COLLAR_ROLES = [
    ["WATCHMAN", "Watchman / Security Guard"],
    ["SECURITY_SUPERVISOR", "Security Supervisor"],
    ["CAR_DRIVER", "Car / Cab Driver"],
    ["TRUCK_DRIVER", "Truck Driver"],
    ["BUS_DRIVER", "Bus / School Van Driver"],
    ["DELIVERY_EXECUTIVE", "Delivery Executive / Courier"],
    ["WAREHOUSE_HELPER", "Warehouse Helper"],
    ["LOADER_UNLOADER", "Loader / Unloader"],
    ["FORKLIFT_OPERATOR", "Forklift Operator"],
    ["PACKER", "Packer"],
    ["STORE_KEEPER", "Store Keeper"],
    ["HOUSEKEEPING", "Housekeeping Attendant"],
    ["CLEANER", "Cleaner / Sweeper"],
    ["OFFICE_BOY", "Office Boy / Peon"],
    ["MASON", "Mason / Mistri"],
    ["CARPENTER", "Carpenter"],
    ["PAINTER", "Painter"],
    ["SITE_LABOURER", "Construction Site Labourer"],
    ["ELECTRICIAN", "Electrician"],
    ["LINEMAN", "Lineman / Wireman"],
    ["AC_TECHNICIAN", "AC / Refrigeration Technician"],
    ["PLUMBER", "Plumber"],
    ["WELDER", "Welder"],
    ["FABRICATOR", "Fabricator / Sheet Metal Worker"],
    ["AUTO_MECHANIC", "Auto / Bike Mechanic"],
    ["TECHNICIAN", "Maintenance Technician"],
    ["MACHINE_OPERATOR", "Machine Operator"],
    ["FACTORY_WORKER", "Factory / Production Worker"],
    ["CNC_OPERATOR", "CNC / Lathe Machinist"],
    ["COOK", "Cook / Chef"],
    ["KITCHEN_HELPER", "Kitchen Helper / Dishwasher"],
    ["WAITER", "Waiter / Steward"],
    ["SHOP_ASSISTANT", "Shop Assistant / Salesman"],
    ["CASHIER", "Cashier / Counter Staff"],
    ["TAILOR", "Tailor"],
    ["GARDENER", "Gardener / Mali"],
    ["FARM_WORKER", "Farm Worker"],
    ["DOMESTIC_HELP", "Domestic Help / Maid"],
    ["CARETAKER", "Caretaker / Nanny"],
    ["WARD_BOY", "Ward Boy / Patient Attendant"],
    ["GENERAL_HELPER", "General Helper"],
    ["FIELD_WORKER", "Field Worker"],
].map(([key, label]) => ({ value: `BLUE_COLLAR_${key}`, label }))

const LABELS = new Map(BLUE_COLLAR_ROLES.map((role) => [role.value, role.label]))

export const isBlueCollar = (roleCategory) => roleCategory === "BLUE_COLLAR" || LABELS.has(roleCategory)

export const blueCollarLabel = (roleCategory) => LABELS.get(roleCategory) || null
