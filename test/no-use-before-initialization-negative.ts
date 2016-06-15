if (true) {
  let x: number = 1;
  let y = x + 5;
  {
    let z: string;
    z = "";
    z = "a";
    let w = z = "b";
    console.log(z.trim());
  }
}
