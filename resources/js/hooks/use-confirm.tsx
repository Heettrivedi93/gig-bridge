import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmOptions {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

type ConfirmFn = (options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
    return useContext(ConfirmContext);
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({});
    const resolveRef = useRef<(value: boolean) => void>();

    const confirm: ConfirmFn = useCallback((opts = {}) => {
        setOptions(opts);
        setOpen(true);

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        setOpen(false);
        resolveRef.current?.(true);
    };

    const handleCancel = () => {
        setOpen(false);
        resolveRef.current?.(false);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog open={open} onOpenChange={(v) => {
 if (!v) {
handleCancel();
} 
}}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
                        {options.description && (
                            <DialogDescription>{options.description}</DialogDescription>
                        )}
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            {options.cancelLabel ?? 'Cancel'}
                        </Button>
                        <Button variant="destructive" onClick={handleConfirm}>
                            {options.confirmLabel ?? 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ConfirmContext.Provider>
    );
}
