/**
 * Does a step keep the interface (decision 077 §2)? Each interface cell still declared, and still read by name where
 * another line read it before: a copy written out (`base=&grouping` as its steps), a table written in place, would leave
 * a parameter that nothing reads.
 */
export declare function keepsInterface(before: string, after: string, keep: ReadonlySet<string>): boolean;
