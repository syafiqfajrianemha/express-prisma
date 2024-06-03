import express, { NextFunction, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 4000;
const prisma = new PrismaClient();

app.use(express.json());

interface UserData {
  id: string;
  name: string;
  email: string;
  address: string;
}

interface ValidationRequest extends Request {
  userData: UserData;
}

const accessValidation = (req: Request, res: Response, next: NextFunction) => {
  const validationReq = req as ValidationRequest;
  const { authorization } = validationReq.headers;

  console.log("here: ", authorization);

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: "Token diperlukan",
    });
  }

  const token = authorization.split(" ")[1];
  const secret = process.env.JWT_SECRET!;

  try {
    const jwtDecode = jwt.verify(token, secret);

    if (typeof jwtDecode !== "string") {
      validationReq.userData = jwtDecode as UserData;
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
  next();
};

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.users.create({
    data: {
      name: name,
      email: email,
      password: hashedPassword,
    },
  });

  return res.json({
    success: true,
    message: "Register successfully",
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.users.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!user?.password) {
    return res.status(404).json({
      success: false,
      message: "Password not set",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(403).json({
      success: false,
      message: "Password is wrong",
    });
  }

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
  };

  const secret = process.env.JWT_SECRET!;
  const expiresIn = 60 * 60 * 1;

  const token = jwt.sign(payload, secret, { expiresIn: expiresIn });

  return res.json({
    success: true,
    message: "Login successfully",
    token: token,
  });
});

app.post("/users", async (req, res) => {
  const { name, email, address } = req.body;

  await prisma.users.create({
    data: {
      name: name,
      email: email,
      address: address,
    },
  });

  return res.status(201).json({
    success: true,
    message: "User has been created",
  });
});

app.get("/users", accessValidation, async (req, res) => {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
    },
  });

  return res.json({
    success: true,
    message: "User fetched successfully",
    data: users,
  });
});

app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, address } = req.body;

  await prisma.users.update({
    data: {
      name: name,
      email: email,
      address: address,
    },
    where: {
      id: Number(id),
    },
  });

  return res.json({
    success: true,
    message: "User updated successfully",
  });
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  await prisma.users.delete({
    where: {
      id: Number(id),
    },
  });

  return res.json({
    success: true,
    message: "User has beed deleted",
  });
});

app.listen(PORT, () => {
  console.log(`Server berhasil running di port ${PORT}`);
});
