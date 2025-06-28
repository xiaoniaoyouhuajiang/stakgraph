"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface Person {
  name: string;
  age: number;
  email: string;
}

export default function PersonPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState<Person>({ name: "", age: 0, email: "" });
  const [loading, setLoading] = useState(false);

  // Fetch people
  useEffect(() => {
    fetch("/api/person")
      .then((res) => res.json())
      .then(setPeople);
  }, []);

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/person", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", age: 0, email: "" });
    // Refresh list
    fetch("/api/person")
      .then((res) => res.json())
      .then(setPeople)
      .finally(() => setLoading(false));
  }

  return (
    <main className="max-w-xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Person</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Age"
              type="number"
              value={form.age || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, age: Number(e.target.value) }))
              }
              required
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Person"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {people.map((p, i) => (
                <li key={i}>
                  {p.name} ({p.age}) - {p.email}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
