import express, {Request, Response} from 'express';
import FileSync from "lowdb/adapters/FileSync";
const low = require('lowdb')
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

interface Task {
    id: number;
    title: string;
    description?: string;
    completed: boolean;
}

interface ErrorResponse {
    error: string;
}

type TaskOrErrorResponse = Task | ErrorResponse;

type Data = {
    tasks: Task[]
}

const adapter = new FileSync<Data>('db.json');


const db = low(adapter);


const app = express();
const port = 3005;

app.use(express.json());

app.get('/tasks', (req: Request, res: Response<Task[]>) => {
    // @ts-ignore
    const tasks = db.get('tasks').value();
    res.send(tasks);
});

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Task API',
            version: '1.0.0',
            description: 'A simple Task API for managing tasks',
        },
    },
    apis: ['./schema.yaml'], // Path to your YAML file containing the Swagger definition
};


app.post('/tasks', (req: Request, res: Response<Task>) => {
    const task = req.body as Task;
    const id = db.get('tasks').size().value() + 1;
    const newTask = {
        ...task,
        id
    };
    db.get('tasks').push(newTask).write();
    res.status(201).send(newTask);
});

app.get('/tasks/:id', (req: Request<{ id: string }>, res: Response<TaskOrErrorResponse>) => {
    const id = parseInt(req.params.id, 10);
    const task = db.get('tasks').find({id}).value();
    if (task) {
        res.send(task);
    } else {
        res.status(404).send({error: 'Task not found'});
    }
});

app.put('/tasks/:taskId', (req: Request<{ taskId: string }>, res: Response<TaskOrErrorResponse>) => {
    const id = parseInt(req.params.taskId, 10);
    const updatedTask = req.body as Task;
    const taskIndex = db.get('tasks').findIndex({id}).value();
    if (taskIndex !== -1) {
        db.get('tasks').splice(taskIndex, 1, {...updatedTask, id}).write();
        res.send({...updatedTask});
    } else {
        res.status(404).send({error: 'Task not found'});
    }
});

app.delete('/tasks/:id', (req: Request<{ id: string }>, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const taskIndex = db.get('tasks').findIndex({id}).value();
    if (taskIndex !== -1) {
        db.get('tasks').splice(taskIndex, 1).write();
        res.sendStatus(204);
    } else {
        res.status(404).send({error: 'Task not found'});
    }
});
//
// app.use(cors());

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    await db.read()
    db.data ||= {tasks: []}
});
