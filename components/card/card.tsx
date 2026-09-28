import { cn } from "@/lib/utils";
import React from "react";

export const Card = ({ className, children }: {
    className?: string;
    children: React.ReactNode
}) => {
    return (
        <div className={cn("bg-white p-4", className)}>{children}</div>
    )

}

export const CardSkelton = ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => {
    return (<div className={cn(
        "h-60 w-full bg-gray-50 rounded-lg overflow-hidden my-4",
        "bg-[radial-gradient(#e5e5e5_1px,transparent_1px)]",
        "bg-size-[10px_10px]",
        // "mask-radial-from-35%",
        className
    )}>
        {children}
    </div>)
}

export const CardHeader = ({className, children}:{
    className?:string;
    children: React.ReactNode
}) => {
    return(<div className={cn("flex items-center gap-2", className)}>{children}</div>)
}

export const CardTitle = ({className, children}:{
    className?: string;
    children: React.ReactNode
}) =>{
    return(
        <div className={cn("font-medium font-prata text-lg tracking-tight", className)}>{children}</div>
    )
}

export const CardDescription = ({className, children}:{
    className?: string;
    children: React.ReactNode
}) => {
    return(
        <p className={cn("text-base text-neutral-500 font-open-sans", className)}>{children}</p>
    )
}

