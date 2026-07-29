import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    credits:{
        type:Number,
        default:1000
    },
    role:{
        type:String,
        enum:["employee","admin","superadmin"],
        default:"employee"
    },
    organizationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Organization",
        default:null
    },
    active:{
        type:Boolean,
        default:true
    },
    department:{
        type:String,
        default:null
    },
    // Set by an Admin to lock this employee's next interview to a specific
    // configuration instead of letting them pick freely (Step1SetUp reads these).
    assignedRole:{
        type:String,
        default:null
    },
    assignedExperience:{
        type:String,
        default:null
    },
    assignedMode:{
        type:String,
        default:null
    },
    assignedContext:{
        type:String,
        default:null
    }

}, {timestamps:true})

const User = mongoose.model("User" , userSchema)

export default User
