export class Person {
  constructor(name, email = null) {
    this.id = Date.now() // Simple unique ID
    this.name = name
    this.email = email
    this.createdAt = new Date()
  }

  // Basic validation
  static validate(person) {
    if (!person.name?.trim()) throw new Error("Name is required")
    if (person.name.length < 2) throw new Error("Name too short")
    return true
  }
}
