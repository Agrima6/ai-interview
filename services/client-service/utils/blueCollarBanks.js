// Built-in question sets for blue-collar drives, one per kind of work. Generated from the interviewer's own role-specific
// questions (workmate-iq-agent blue_collar.py) so what HR sees here is what a watchman, driver or cook is actually asked.
// roleCategories lists the drive roles each set is the natural choice for.
export const BLUE_COLLAR_QUESTION_BANKS = [
    {
        "title": "Security / Watchman - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_WATCHMAN",
            "BLUE_COLLAR_SECURITY_SUPERVISOR"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_security_1",
                "text": "It is two in the night and you see someone you do not know walking towards the gate. What will you do?",
                "topic": "Security / Watchman",
                "timeLimit": 90
            },
            {
                "id": "bc_security_2",
                "text": "A visitor is angry because you are not letting him in without a pass. How do you handle it?",
                "topic": "Security / Watchman",
                "timeLimit": 90
            },
            {
                "id": "bc_security_3",
                "text": "You are on a long night shift and feel very sleepy. What do you do to stay alert and keep the place safe?",
                "topic": "Security / Watchman",
                "timeLimit": 90
            },
            {
                "id": "bc_security_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Security / Watchman",
                "timeLimit": 90
            },
            {
                "id": "bc_security_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Security / Watchman",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Driver / Transport - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_CAR_DRIVER",
            "BLUE_COLLAR_TRUCK_DRIVER",
            "BLUE_COLLAR_BUS_DRIVER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_driving_1",
                "text": "Before you start the vehicle in the morning, what all do you check?",
                "topic": "Driver / Transport",
                "timeLimit": 90
            },
            {
                "id": "bc_driving_2",
                "text": "The vehicle breaks down on the highway with a load or passengers inside. What will you do first?",
                "topic": "Driver / Transport",
                "timeLimit": 90
            },
            {
                "id": "bc_driving_3",
                "text": "You are running late and the road ahead is jammed. Someone tells you to take a risky shortcut. What do you decide?",
                "topic": "Driver / Transport",
                "timeLimit": 90
            },
            {
                "id": "bc_driving_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Driver / Transport",
                "timeLimit": 90
            },
            {
                "id": "bc_driving_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Driver / Transport",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Delivery / Courier - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_DELIVERY_EXECUTIVE"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_delivery_1",
                "text": "The customer is not picking up the phone and you are at the address. What do you do?",
                "topic": "Delivery / Courier",
                "timeLimit": 90
            },
            {
                "id": "bc_delivery_2",
                "text": "You find the parcel is damaged before you reach the customer. What will you do?",
                "topic": "Delivery / Courier",
                "timeLimit": 90
            },
            {
                "id": "bc_delivery_3",
                "text": "You have ten deliveries and not enough time. How do you plan your route?",
                "topic": "Delivery / Courier",
                "timeLimit": 90
            },
            {
                "id": "bc_delivery_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Delivery / Courier",
                "timeLimit": 90
            },
            {
                "id": "bc_delivery_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Delivery / Courier",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Warehouse / Logistics - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_WAREHOUSE_HELPER",
            "BLUE_COLLAR_LOADER_UNLOADER",
            "BLUE_COLLAR_FORKLIFT_OPERATOR",
            "BLUE_COLLAR_PACKER",
            "BLUE_COLLAR_STORE_KEEPER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_warehouse_1",
                "text": "How do you lift and carry a heavy box safely?",
                "topic": "Warehouse / Logistics",
                "timeLimit": 90
            },
            {
                "id": "bc_warehouse_2",
                "text": "You are asked to pick ten items but you find only eight on the shelf. What do you do?",
                "topic": "Warehouse / Logistics",
                "timeLimit": 90
            },
            {
                "id": "bc_warehouse_3",
                "text": "You see a wet floor and a pile of boxes leaning near the walkway. What will you do?",
                "topic": "Warehouse / Logistics",
                "timeLimit": 90
            },
            {
                "id": "bc_warehouse_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Warehouse / Logistics",
                "timeLimit": 90
            },
            {
                "id": "bc_warehouse_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Warehouse / Logistics",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Housekeeping / Cleaning - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_HOUSEKEEPING",
            "BLUE_COLLAR_CLEANER",
            "BLUE_COLLAR_OFFICE_BOY"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_housekeeping_1",
                "text": "How will you clean a washroom so that it is ready for the next guest?",
                "topic": "Housekeeping / Cleaning",
                "timeLimit": 90
            },
            {
                "id": "bc_housekeeping_2",
                "text": "While cleaning a room you find a wallet on the table. What will you do?",
                "topic": "Housekeeping / Cleaning",
                "timeLimit": 90
            },
            {
                "id": "bc_housekeeping_3",
                "text": "You are told to mix two cleaning chemicals to make them stronger. What will you do?",
                "topic": "Housekeeping / Cleaning",
                "timeLimit": 90
            },
            {
                "id": "bc_housekeeping_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Housekeeping / Cleaning",
                "timeLimit": 90
            },
            {
                "id": "bc_housekeeping_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Housekeeping / Cleaning",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Construction / Site - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_MASON",
            "BLUE_COLLAR_CARPENTER",
            "BLUE_COLLAR_PAINTER",
            "BLUE_COLLAR_SITE_LABOURER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_construction_1",
                "text": "You have to work on the second floor outside the building. What safety things do you make sure of?",
                "topic": "Construction / Site",
                "timeLimit": 90
            },
            {
                "id": "bc_construction_2",
                "text": "The supervisor gives you a measurement but you think it is wrong. What do you do?",
                "topic": "Construction / Site",
                "timeLimit": 90
            },
            {
                "id": "bc_construction_3",
                "text": "A co-worker is working without a helmet near falling materials. What will you do?",
                "topic": "Construction / Site",
                "timeLimit": 90
            },
            {
                "id": "bc_construction_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Construction / Site",
                "timeLimit": 90
            },
            {
                "id": "bc_construction_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Construction / Site",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Electrician / Electrical - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_ELECTRICIAN",
            "BLUE_COLLAR_LINEMAN",
            "BLUE_COLLAR_AC_TECHNICIAN"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_electrical_1",
                "text": "Before you touch a switchboard or wiring for repair, what do you do first?",
                "topic": "Electrician / Electrical",
                "timeLimit": 90
            },
            {
                "id": "bc_electrical_2",
                "text": "A customer says the lights keep tripping the MCB. How will you find the problem?",
                "topic": "Electrician / Electrical",
                "timeLimit": 90
            },
            {
                "id": "bc_electrical_3",
                "text": "Someone gets an electric shock at the site. What will you do immediately?",
                "topic": "Electrician / Electrical",
                "timeLimit": 90
            },
            {
                "id": "bc_electrical_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Electrician / Electrical",
                "timeLimit": 90
            },
            {
                "id": "bc_electrical_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Electrician / Electrical",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Plumber / Pipe fitter - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_PLUMBER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_plumbing_1",
                "text": "A customer has a leak under the kitchen sink. How will you find and fix it?",
                "topic": "Plumber / Pipe fitter",
                "timeLimit": 90
            },
            {
                "id": "bc_plumbing_2",
                "text": "You finish the work but the customer's floor is wet and dirty. What do you do?",
                "topic": "Plumber / Pipe fitter",
                "timeLimit": 90
            },
            {
                "id": "bc_plumbing_3",
                "text": "The customer wants a cheaper fitting that you know will not last. What will you tell them?",
                "topic": "Plumber / Pipe fitter",
                "timeLimit": 90
            },
            {
                "id": "bc_plumbing_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Plumber / Pipe fitter",
                "timeLimit": 90
            },
            {
                "id": "bc_plumbing_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Plumber / Pipe fitter",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Mechanic / Technician - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_AUTO_MECHANIC",
            "BLUE_COLLAR_TECHNICIAN"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_mechanic_1",
                "text": "A machine or vehicle is making a strange noise. How will you find out what is wrong?",
                "topic": "Mechanic / Technician",
                "timeLimit": 90
            },
            {
                "id": "bc_mechanic_2",
                "text": "You open a unit for repair and find another problem that was not told to you. What do you do?",
                "topic": "Mechanic / Technician",
                "timeLimit": 90
            },
            {
                "id": "bc_mechanic_3",
                "text": "You are repairing something and a spare part is not available. What will you do?",
                "topic": "Mechanic / Technician",
                "timeLimit": 90
            },
            {
                "id": "bc_mechanic_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Mechanic / Technician",
                "timeLimit": 90
            },
            {
                "id": "bc_mechanic_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Mechanic / Technician",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Welder / Fabricator - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_WELDER",
            "BLUE_COLLAR_FABRICATOR",
            "BLUE_COLLAR_CNC_OPERATOR"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_welding_1",
                "text": "What safety things do you use and check before you start welding?",
                "topic": "Welder / Fabricator",
                "timeLimit": 90
            },
            {
                "id": "bc_welding_2",
                "text": "After welding, the joint looks weak or has gaps. What do you do?",
                "topic": "Welder / Fabricator",
                "timeLimit": 90
            },
            {
                "id": "bc_welding_3",
                "text": "You are given a drawing with measurements. How do you make sure the piece comes out right?",
                "topic": "Welder / Fabricator",
                "timeLimit": 90
            },
            {
                "id": "bc_welding_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Welder / Fabricator",
                "timeLimit": 90
            },
            {
                "id": "bc_welding_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Welder / Fabricator",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Factory / Machine operator - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_MACHINE_OPERATOR",
            "BLUE_COLLAR_FACTORY_WORKER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_factory_1",
                "text": "While operating a machine you notice it is vibrating more than usual. What will you do?",
                "topic": "Factory / Machine operator",
                "timeLimit": 90
            },
            {
                "id": "bc_factory_2",
                "text": "You find that some of the items you made are not matching the sample. What will you do?",
                "topic": "Factory / Machine operator",
                "timeLimit": 90
            },
            {
                "id": "bc_factory_3",
                "text": "Your shift is ending and the next person has not come. How will you hand over the work?",
                "topic": "Factory / Machine operator",
                "timeLimit": 90
            },
            {
                "id": "bc_factory_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Factory / Machine operator",
                "timeLimit": 90
            },
            {
                "id": "bc_factory_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Factory / Machine operator",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Kitchen / Hospitality - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_COOK",
            "BLUE_COLLAR_KITCHEN_HELPER",
            "BLUE_COLLAR_WAITER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_kitchen_1",
                "text": "The kitchen is very busy and many orders come together. How will you manage?",
                "topic": "Kitchen / Hospitality",
                "timeLimit": 90
            },
            {
                "id": "bc_kitchen_2",
                "text": "You see that some vegetables or food have gone bad. What will you do?",
                "topic": "Kitchen / Hospitality",
                "timeLimit": 90
            },
            {
                "id": "bc_kitchen_3",
                "text": "A guest says the food is cold and is upset. How do you respond?",
                "topic": "Kitchen / Hospitality",
                "timeLimit": 90
            },
            {
                "id": "bc_kitchen_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Kitchen / Hospitality",
                "timeLimit": 90
            },
            {
                "id": "bc_kitchen_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Kitchen / Hospitality",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Retail / Shop floor - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_SHOP_ASSISTANT",
            "BLUE_COLLAR_CASHIER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_retail_1",
                "text": "A customer wants to return an item and the bill is not with them. What do you do?",
                "topic": "Retail / Shop floor",
                "timeLimit": 90
            },
            {
                "id": "bc_retail_2",
                "text": "You gave extra change to a customer by mistake after they left. What would you do?",
                "topic": "Retail / Shop floor",
                "timeLimit": 90
            },
            {
                "id": "bc_retail_3",
                "text": "A customer asks about a product you do not know well. How do you help?",
                "topic": "Retail / Shop floor",
                "timeLimit": 90
            },
            {
                "id": "bc_retail_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Retail / Shop floor",
                "timeLimit": 90
            },
            {
                "id": "bc_retail_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Retail / Shop floor",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Tailor / Textile - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_TAILOR"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_tailoring_1",
                "text": "A customer wants the dress by tomorrow but you have many orders. What will you do?",
                "topic": "Tailor / Textile",
                "timeLimit": 90
            },
            {
                "id": "bc_tailoring_2",
                "text": "After stitching you see that the measurement is slightly wrong. What do you do?",
                "topic": "Tailor / Textile",
                "timeLimit": 90
            },
            {
                "id": "bc_tailoring_3",
                "text": "How do you take correct measurements for a shirt or blouse?",
                "topic": "Tailor / Textile",
                "timeLimit": 90
            },
            {
                "id": "bc_tailoring_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Tailor / Textile",
                "timeLimit": 90
            },
            {
                "id": "bc_tailoring_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Tailor / Textile",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Agriculture / Field - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_GARDENER",
            "BLUE_COLLAR_FARM_WORKER"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_agriculture_1",
                "text": "You find that some plants or animals in your care look sick. What do you do?",
                "topic": "Agriculture / Field",
                "timeLimit": 90
            },
            {
                "id": "bc_agriculture_2",
                "text": "How do you safely use pesticide or any chemical in the field?",
                "topic": "Agriculture / Field",
                "timeLimit": 90
            },
            {
                "id": "bc_agriculture_3",
                "text": "A sudden rain starts while the work is half done. What do you do?",
                "topic": "Agriculture / Field",
                "timeLimit": 90
            },
            {
                "id": "bc_agriculture_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Agriculture / Field",
                "timeLimit": 90
            },
            {
                "id": "bc_agriculture_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Agriculture / Field",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "Domestic / Care - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_DOMESTIC_HELP",
            "BLUE_COLLAR_CARETAKER",
            "BLUE_COLLAR_WARD_BOY"
        ],
        "questionCount": 5,
        "durationMinutes": 8,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_domestic_1",
                "text": "The family's child or an elderly person is not feeling well when you are alone with them. What will you do?",
                "topic": "Domestic / Care",
                "timeLimit": 90
            },
            {
                "id": "bc_domestic_2",
                "text": "You accidentally break something valuable in the house. What will you do?",
                "topic": "Domestic / Care",
                "timeLimit": 90
            },
            {
                "id": "bc_domestic_3",
                "text": "The family gives you instructions that are different from the previous family you worked with. How do you handle it?",
                "topic": "Domestic / Care",
                "timeLimit": 90
            },
            {
                "id": "bc_domestic_4",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "Domestic / Care",
                "timeLimit": 90
            },
            {
                "id": "bc_domestic_5",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "Domestic / Care",
                "timeLimit": 90
            }
        ]
    },
    {
        "title": "General helper / Field worker - Practical Questions",
        "category": "BLUE_COLLAR",
        "roleCategories": [
            "BLUE_COLLAR_GENERAL_HELPER",
            "BLUE_COLLAR_FIELD_WORKER"
        ],
        "questionCount": 2,
        "durationMinutes": 3,
        "isSystemDefault": true,
        "questions": [
            {
                "id": "bc_general_1",
                "text": "You are told to do a task you have never done before. What will you do?",
                "topic": "General helper / Field worker",
                "timeLimit": 90
            },
            {
                "id": "bc_general_2",
                "text": "You reach work and see that two people from your team are absent. How will you manage the work?",
                "topic": "General helper / Field worker",
                "timeLimit": 90
            }
        ]
    }
]
