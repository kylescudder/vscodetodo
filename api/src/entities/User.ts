import { BaseEntity, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ToDo } from "./todo";

@Entity()
export class User extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text", { nullable: true})
    name: string;

    @Column("text", { unique: true })
    githubId: string;

    @OneToMany(() => ToDo, t => t.creator)
    todos: Promise<ToDo[]>;
}