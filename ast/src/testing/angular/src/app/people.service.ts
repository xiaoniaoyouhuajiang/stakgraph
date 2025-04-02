

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Person } from './models/person.model';

@Injectable({
  providedIn: 'root',
})
export class PeopleService {
  private peopleSubject = new BehaviorSubject<Person[]>([]);
  people$ = this.peopleSubject.asObservable();

  private people: Person[] = [];

  constructor() {}


  addPerson(person: Person): void {
    this.people.push(person);
    this.peopleSubject.next(this.people);
  }


  deletePerson(id: number): void {
    this.people = this.people.filter(person => person.id !== id);
    this.peopleSubject.next(this.people);
  }

}
