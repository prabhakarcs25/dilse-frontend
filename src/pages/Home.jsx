import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../hooks/useUser";

const Home = () => {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("boy");
  const [lookingFor, setLookingFor] = useState("girl");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");

  const { setUser } = useUser();
  const navigate = useNavigate();

  const handleConnect = () => {
    if (!name || !age || !city) return alert("Please fill all fields");

    setUser({
      name: name.trim(),
      gender,
      lookingFor,
      age: Number(age),
      city: city.trim().toLowerCase(),
    });

    navigate("/chat");
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-pink-50">
      <h1 className="text-4xl font-bold text-pink-600 mb-6">
        Dil Se Dil Tak 💖
      </h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-4 py-2 rounded mb-4 w-64"
      />
      <input
        type="number"
        placeholder="Your age"
        value={age}
        onChange={(e) => setAge(e.target.value)}
        className="border px-4 py-2 rounded mb-4 w-64"
      />
      <input
        type="text"
        placeholder="Your city"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="border px-4 py-2 rounded mb-4 w-64"
      />
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="mb-2 px-4 py-2 rounded w-64"
      >
        <option value="boy">Boy</option>
        <option value="girl">Girl</option>
      </select>
      <select
        value={lookingFor}
        onChange={(e) => setLookingFor(e.target.value)}
        className="mb-4 px-4 py-2 rounded w-64"
      >
        <option value="girl">Connect with Girl</option>
        <option value="boy">Connect with Boy</option>
      </select>
      <button
        onClick={handleConnect}
        className="bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600"
      >
        Connect Now 💌
      </button>
    </div>
  );
};

export default Home;
