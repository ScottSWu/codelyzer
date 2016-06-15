let x = {
  id: 1
};

console.log(x["id"] + 1);

interface Y {
  id: string;
}

const y: Y = {};

y["hello"] = "world!";

interface Z {
  [id: string]: string;
}

const z: Z = {};

z["hello"] = "world!";

