import { cn } from "@/lib/utils";

export const Heading = ({ children, className, ...props }: { children: React.ReactNode; className?: string; } & React.LabelHTMLAttributes<HTMLLabelElement>) => {
    return (
        <label {...props} className={cn("text-2xl font-semibold tracking-tight text-black dark:text-white", className)}>
            {children}
        </label>
    )
}

export const SubHeading = ({ children, className, ...props }: { children: React.ReactNode; className?: string; } & React.LabelHTMLAttributes<HTMLLabelElement>) => {
    return (
        <label {...props} className={cn("font-medium text-lg tracking-tight", className)}>
            {children}
        </label>
    )
}

export const Input = ({className, ...props }: {className?: string } & React.InputHTMLAttributes<HTMLInputElement>) => {
    return (
        <input
        {...props}
            className={cn("focus:outline-none  border focus:border-neutral-300 focus:bg-neutral-100 border-transparent px-4 py-2 bg-gray-50 rounded-lg shadow-input transition-all duration-200 placeholder:text-neutral-300", className)}
        />

    )
}

export const Group = ({children, className} : {children:React.ReactNode; className?:string}) => {
    return(
        <div className={cn("flex flex-col gap-2", className)}>
            {children}
        </div>
    )
}

export default function Container({children, className}: { children : React.ReactNode, className?: string}){
    return (
        <div className={cn("max-w-6xl mx-auto",className)}>
            {children}
        </div>
    )
}


export const Label = ({children, className, ...props} : {children: React.ReactNode; className?:string;} & React.LabelHTMLAttributes<HTMLLabelElement>) => {
    return (   
        <label {...props} className={cn("text-neutral-700 font-medium", className)}>
            {children}
        </label>  
    )
}


