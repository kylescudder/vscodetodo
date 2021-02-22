import { BaseEntity, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class ToDo extends BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    text: string;


    @Column("boolean", { default: false })
    completed: boolean;

    @Column()
    creatorId: number;
    @ManyToOne(() => User, (u) => u.todos)
    @JoinColumn({ name: "creatorId"})
    creator: Promise<User>;

    @Column()
    completedDate: Date;
    
    @Column()
    categorieText: string;
}