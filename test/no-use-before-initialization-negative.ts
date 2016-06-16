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

let k: any;
while (((k = 5).toString()).length < 0) {
  console.log(k.toString());
}
