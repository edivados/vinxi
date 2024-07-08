export default {
    meta: {
      name: "my-task", 
      description: "Run my demo task",
    },
    run({ payload, context }) {
      console.log("Running my demo task...");
      return { result: "Success" };
    },
};