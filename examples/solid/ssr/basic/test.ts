export default function plug(devApp, app) {
    console.log("hi i am test")
    console.log(app.hooks.hook("app:dev:server:closed", () => {
        console.log("closing");
    }));
}