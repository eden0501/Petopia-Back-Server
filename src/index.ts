import initApp from "./server";

const PORT = process.env.PORT || 3000;

initApp().then((app) => {
  app.listen(PORT, () => {
    console.log(`Example app listening on port: ${PORT}`);
  });
});
