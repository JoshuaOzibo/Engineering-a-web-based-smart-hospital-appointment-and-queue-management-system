const { DepartmentModel } = require("../models/department.model");
const departmentRouter = require("express").Router();

// GET ALL DEPARTMENTS-----------------------------------------------------------------

departmentRouter.get("/getAllDepartment", async (req, res) => {
  try {
    let allDepartments = await DepartmentModel.find();
    if (allDepartments.length === 0) {
      const defaults = [
        {
          departmentId: 1,
          deptName: "Cardiology",
          image: "https://images.unsplash.com/photo-1579684389782-64d84b5e9053?q=80&w=300",
          about: "Specialized care for heart and cardiovascular health, including diagnostics, therapy, and surgery."
        },
        {
          departmentId: 2,
          deptName: "Dermatology",
          image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=300",
          about: "Expert diagnosis and treatment for diseases of the skin, hair, nails, and cosmetic concerns."
        },
        {
          departmentId: 3,
          deptName: "Pediatrics",
          image: "https://images.unsplash.com/photo-1502740479091-635887520276?q=80&w=300",
          about: "Comprehensive healthcare services dedicated to infants, children, and adolescents."
        },
        {
          departmentId: 4,
          deptName: "Neurology",
          image: "https://images.unsplash.com/photo-1559757175-5700dde675bc?q=80&w=300",
          about: "Diagnosis and management of disorders affecting the brain, spinal cord, and nervous system."
        },
        {
          departmentId: 5,
          deptName: "General Medicine",
          image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=300",
          about: "Primary healthcare, preventive medicine, wellness exams, and general health consulting."
        },
        {
          departmentId: 6,
          deptName: "Orthopedics",
          image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=300",
          about: "Expert treatment for bone, joint, muscle, ligament, and tendon disorders or sports injuries."
        }
      ];
      
      await DepartmentModel.insertMany(defaults);
      allDepartments = await DepartmentModel.find();
      console.log("Seeded default departments successfully.");
    }
    res.status(201).send({ msg: "All Departments", allDepartments });
  } catch (error) {
    res.status(404).send({ msg: "Server Error" });
  }
});

// CREATE A DEPARTMENT-----------------------------------------------------
departmentRouter.post("/createDepartment", async (req, res) => {
  let payload = req.body;
  try {
    let department = await DepartmentModel(payload);
    await department.save();
    res.status(201).send({ msg: "Department has been created", department });
  } catch (error) {
    console.log("Error while creating department");
    res.status(400).send({ msg: "Error while creating department", error });
  }
});

// GET DEPARTMENT BY ID----------------------------------------------------------
departmentRouter.get("/getDepartment/:id", async (req, res) => {
  let departmentId = req.params.id;
  try {
    let isPresent = await DepartmentModel.findOne({ departmentId });
    if (isPresent) {
      res
        .status(201)
        .send({ msg: "Department is present", department: isPresent });
    } else res.send({ msg: "Department not found " });
  } catch (error) {
    res.status(404).send({ msg: "Error in finding department" });
  }
});

// DELETE DEPARTMENT-----------------------------------------------------------------
departmentRouter.delete("/deleteDepartment/:id", async (req, res) => {
  try {
    let departmentId = req.params.id;
    let isDepartmentPresent = await DepartmentModel.findOne({
      departmentId: departmentId,
    });
    if (!isDepartmentPresent) {
      return res
        .status(404)
        .send({ message: "Department with associated id not found" });
    } else {
      await DepartmentModel.findByIdAndDelete({ _id: isDepartmentPresent._id });
      res
        .status(200)
        .send({ msg: "Deleted the department from the system successfully" });
    }
  } catch (error) {
    res.send({ msg: "Error in deleting department" });
  }
});

// UPDATE DEPARTMENT-----------------------------------------------------------------
departmentRouter.patch("/updateDepartment/:id", async (req, res) => {
  try {
    let departmentId = req.params.id;
    let payload = req.body;
    let isDepartmentPresent = await DepartmentModel.findOne({
      departmentId: departmentId,
    });
    if (!isDepartmentPresent) {
      return res
        .status(404)
        .send({ message: "Department with associated id not found" });
    } else {
      let department = await DepartmentModel.findByIdAndUpdate(
        { _id: isDepartmentPresent._id },
        payload
      );
      res
        .status(200)
        .send({ msg: "Update the department successfully", department });
    }
  } catch (error) {
    res.send({ msg: "Error in Updating department" });
  }
});

module.exports = {
  departmentRouter,
};
