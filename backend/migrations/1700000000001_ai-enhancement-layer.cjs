/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * AI Enhancement Layer migration.
 *
 * Adds tables supporting:
 *   - LLM receipt understanding + embedding categorization (receipt_ai_metadata)
 *   - Category prototype embeddings (category_embeddings)
 *   - Model evaluation history (model_evaluations)
 *   - Spending forecasts (spending_forecasts)
 *   - AI-generated insights (ai_insights)
 *
 * Fully reversible via the down migration.
 */

exports.up = async (pgm) => {
  // Receipt AI metadata: LLM extraction, OCR comparison, embedding, predicted category
  pgm.createTable('receipt_ai_metadata', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    receipt_id: { type: 'uuid', notNull: true, references: 'receipts', onDelete: 'CASCADE', unique: true },
    llm_extracted: { type: 'jsonb' },
    ocr_extracted: { type: 'jsonb' },
    discrepancies: { type: 'jsonb' },
    embedding: { type: 'real[]' },
    predicted_category: { type: 'text' },
    category_confidence: { type: 'real' },
    category_model_source: { type: 'text' },
    embedding_score: { type: 'real' },
    fallback_reason: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createIndex('receipt_ai_metadata', 'receipt_id', { name: 'idx_receipt_ai_receipt' });

  // Category prototype embeddings for semantic categorization
  pgm.createTable('category_embeddings', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    category: { type: 'text', notNull: true },
    label: { type: 'text', notNull: true },
    embedding: { type: 'real[]', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.addConstraint('category_embeddings', 'category_embeddings_user_cat_label_uniq', {
    unique: ['user_id', 'category', 'label'],
  });
  pgm.createIndex('category_embeddings', ['user_id', 'category'], { name: 'idx_category_emb_user' });

  // Model evaluation history
  pgm.createTable('model_evaluations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    model_name: { type: 'text', notNull: true },
    accuracy: { type: 'real' },
    precision_score: { type: 'real' },
    recall_score: { type: 'real' },
    f1_score: { type: 'real' },
    confusion_matrix: { type: 'jsonb' },
    sample_size: { type: 'integer' },
    evaluated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createIndex('model_evaluations', ['user_id', 'evaluated_at'], { name: 'idx_model_eval_user' });

  // Spending forecasts
  pgm.createTable('spending_forecasts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    forecast_date: { type: 'date', notNull: true },
    predicted_amount: { type: 'real', notNull: true },
    actual_amount: { type: 'real' },
    confidence_lower: { type: 'real' },
    confidence_upper: { type: 'real' },
    model_name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createIndex('spending_forecasts', ['user_id', 'forecast_date'], { name: 'idx_forecast_user' });

  // AI-generated insights
  pgm.createTable('ai_insights', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    insight_type: { type: 'text', notNull: true },
    title: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true },
    severity: { type: 'text', default: 'info' },
    data: { type: 'jsonb' },
    generated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });
  pgm.createIndex('ai_insights', ['user_id', 'generated_at'], { name: 'idx_insights_user' });
};

exports.down = async (pgm) => {
  pgm.dropTable('ai_insights');
  pgm.dropTable('spending_forecasts');
  pgm.dropTable('model_evaluations');
  pgm.dropTable('category_embeddings');
  pgm.dropTable('receipt_ai_metadata');
};
