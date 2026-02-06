package com.kavyapharm.farmatrack.expense.service;

import com.kavyapharm.farmatrack.expense.dto.CreateExpenseRequest;
import com.kavyapharm.farmatrack.expense.dto.ExpenseResponse;
import com.kavyapharm.farmatrack.expense.dto.UpdateExpenseRequest;
import com.kavyapharm.farmatrack.expense.model.Expense;
import com.kavyapharm.farmatrack.expense.model.Expense.ExpenseStatus;
import com.kavyapharm.farmatrack.expense.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private static final String UPLOAD_DIR = "uploads/receipts/";

    public ExpenseServiceImpl(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
        // Create upload directory if it doesn't exist
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @Override
    public ExpenseResponse createExpense(CreateExpenseRequest request) {
        Expense expense = new Expense();
        expense.setMrName(request.mrName());
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setDescription(request.description());
        expense.setExpenseDate(request.expenseDate());
        expense.setStatus(ExpenseStatus.PENDING);
        expense.setReceiptFilename(request.receiptFilename());

        Expense saved = expenseRepository.save(expense);
        return ExpenseResponse.from(saved);
    }

    @Override
    public ExpenseResponse createExpenseWithReceipt(CreateExpenseRequest request, MultipartFile receipt)
            throws IOException {
        Expense expense = new Expense();
        expense.setMrName(request.mrName());
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setDescription(request.description());
        expense.setExpenseDate(request.expenseDate());
        expense.setStatus(ExpenseStatus.PENDING);

        if (receipt != null && !receipt.isEmpty()) {
            String filePath = uploadReceipt(receipt);
            expense.setReceiptPath(filePath);
            expense.setReceiptFilename(receipt.getOriginalFilename());
        }

        Expense saved = expenseRepository.save(expense);
        return ExpenseResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseResponse> getAllExpenses() {
        return expenseRepository.findAllByOrderBySubmittedDateDesc()
                .stream()
                .map(ExpenseResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpensesByMr(String mrName) {
        return expenseRepository.findByMrNameIgnoreCaseOrderBySubmittedDateDesc(mrName)
                .stream()
                .map(ExpenseResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponse getExpenseById(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found with id: " + id));
        return ExpenseResponse.from(expense);
    }

    @Override
    public ExpenseResponse updateExpense(Long id, UpdateExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found with id: " + id));

        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setDescription(request.description());
        expense.setExpenseDate(request.expenseDate());

        if (request.receiptFilename() != null) {
            expense.setReceiptFilename(request.receiptFilename());
        }

        Expense updated = expenseRepository.save(expense);
        return ExpenseResponse.from(updated);
    }

    @Override
    public ExpenseResponse updateExpenseWithReceipt(Long id, UpdateExpenseRequest request, MultipartFile receipt)
            throws IOException {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found with id: " + id));

        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setDescription(request.description());
        expense.setExpenseDate(request.expenseDate());

        if (receipt != null && !receipt.isEmpty()) {
            // Delete old receipt if exists
            if (expense.getReceiptPath() != null) {
                try {
                    Files.deleteIfExists(Paths.get(expense.getReceiptPath()));
                } catch (IOException e) {
                    // Log but don't fail
                }
            }

            String filePath = uploadReceipt(receipt);
            expense.setReceiptPath(filePath);
            expense.setReceiptFilename(receipt.getOriginalFilename());
        }

        Expense updated = expenseRepository.save(expense);
        return ExpenseResponse.from(updated);
    }

    @Override
    public ExpenseResponse approveExpense(Long id, String approvedBy) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found with id: " + id));

        expense.setStatus(ExpenseStatus.APPROVED);
        expense.setApprovedBy(approvedBy);
        expense.setApprovedDate(LocalDateTime.now());
        expense.setRejectionReason(null); // Clear any previous rejection reason

        Expense updated = expenseRepository.save(expense);
        return ExpenseResponse.from(updated);
    }

    @Override
    public ExpenseResponse rejectExpense(Long id, String rejectedBy, String reason) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found with id: " + id));

        expense.setStatus(ExpenseStatus.REJECTED);
        expense.setApprovedBy(rejectedBy);
        expense.setApprovedDate(LocalDateTime.now());
        expense.setRejectionReason(reason);

        Expense updated = expenseRepository.save(expense);
        return ExpenseResponse.from(updated);
    }

    @Override
    public void deleteExpense(Long id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found with id: " + id));

        // Delete receipt file if exists
        if (expense.getReceiptPath() != null) {
            try {
                Files.deleteIfExists(Paths.get(expense.getReceiptPath()));
            } catch (IOException e) {
                // Log but don't fail
            }
        }

        expenseRepository.deleteById(id);
    }

    @Override
    public String uploadReceipt(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.startsWith("image/") && !contentType.equals("application/pdf"))) {
            throw new IllegalArgumentException("Only image and PDF files are allowed");
        }

        // Validate file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size must not exceed 5MB");
        }

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String uniqueFilename = UUID.randomUUID().toString() + extension;

        // Save file
        Path filePath = Paths.get(UPLOAD_DIR + uniqueFilename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return filePath.toString();
    }
}
