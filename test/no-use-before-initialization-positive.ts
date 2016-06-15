if (true) {
  let x: number;
  x[1];
  let y = x + 5;
  {
    let z: string;
    let w = z.trim();
    let sum: number;
    function a() {
      for (let i = 0; i < z.length; i++) {
        sum += i;
      }
    }
    sum = 0;
    a();
  }
}

for (let i; i < 10; i++) {
  console.log(i);
}
