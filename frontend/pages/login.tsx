import { useState, type FormEvent } from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import { login } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Signing in...");
    try {
      const result = await login({ email, password });
      setStatus(`Welcome, ${result.userName}`);
    } catch {
      setStatus("Unable to sign in");
    }
  }

  return (
    <main>
      <Card title="Behavioral Health Login">
        <form onSubmit={onSubmit} className="stack">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit">Log In</Button>
          <p aria-live="polite">{status}</p>
        </form>
      </Card>
    </main>
  );
}
